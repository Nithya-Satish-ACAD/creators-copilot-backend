from backend.utils.openai_client import client
from backend.utils.storage_course import storage_service
from backend.utils.exceptions import CourseNotFoundError, ResourceNotFoundError, ResourceAlreadyCheckedOutError, ResourceAlreadyCheckedInError, OpenAIError
from backend.config.settings import settings
from uuid import uuid4
import logging
from typing import List, Tuple, Optional
from fastapi import UploadFile
import time
from datetime import datetime
from openai.types.beta.assistant import ToolResources
from backend.config.firebase import db
import os
import shutil
from pathlib import Path
from io import BytesIO

logger = logging.getLogger(__name__)

# Local storage configuration
LOCAL_STORAGE_DIR = Path("local_storage")
LOCAL_STORAGE_DIR.mkdir(exist_ok=True)

async def create_course_and_assistant(name: str, description: str, year: int, level: str, user_id: str) -> Tuple[str, str]:
    try:
        course_id = str(uuid4())
        # Create assistant with v2 API compatible parameters and file search enabled
        assistant = client.beta.assistants.create(
            name=name,
            instructions=f"You are an assistant for the course: {name}. Description: {description}. Year: {year}, Level: {level}. You help students with course-related questions and provide guidance based on the course materials. You have access to course files and can search through them to provide accurate answers.",
            model=settings.OPENAI_MODEL,
            tools=[{"type": "file_search"}]
        )
        logger.info(f"Created assistant {assistant.id} for course {course_id}")
        # Store course data
        course_data = {
            "name": name,
            "description": description,
            "year": year,
            "level": level,
            "status": "draft",
            "assistant_id": assistant.id,
            "resources": {},
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        storage_service.create_course(course_id, course_data)
        logger.info(f"Created course {course_id} with assistant {assistant.id}")
        return course_id, assistant.id
    except Exception as e:
        logger.error(f"Error creating course and assistant: {str(e)}")
        raise OpenAIError(f"Failed to create course and assistant: {str(e)}")

async def update_course(course_id: str, name: Optional[str], description: Optional[str], archived: Optional[bool], user_id: str) -> dict:
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found")
        
        if name is not None:
            course["name"] = name
        if description is not None:
            course["description"] = description
        if archived is not None:
            course["status"] = "archived" if archived else "draft"
        
        course["updated_at"] = datetime.utcnow().isoformat()
        
        # Update assistant
        client.beta.assistants.update(
            assistant_id=course["assistant_id"],
            name=course["name"],
            instructions=f"You are an assistant for the course: {course['name']}. Description: {course['description']}"
        )
        
        storage_service.update_course(course_id, course)
        logger.info(f"Updated course {course_id}")
        return course
    except CourseNotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error updating course {course_id}: {str(e)}")
        raise OpenAIError(f"Failed to update course: {str(e)}")

async def delete_course(course_id: str, user_id: str):
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found")
        
        # Delete assistant
        client.beta.assistants.delete(assistant_id=course["assistant_id"])
        storage_service.delete_course(course_id)
        logger.info(f"Deleted course {course_id}")
    except CourseNotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting course {course_id}: {str(e)}")
        raise OpenAIError(f"Failed to delete course: {str(e)}")

async def create_resource(course_id: str, title: str, url: str, user_id: str, thread_id: Optional[str] = None) -> dict:
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found")
        file_id = str(uuid4())
        resource = {
            "title": title,
            "status": "checked_in",
            "checkedOutBy": None,
            "url": url,
            "created_at": datetime.utcnow().isoformat()
        }
        if thread_id:
            storage_service.create_resource(course_id, file_id, resource, thread_id=thread_id)
        else:
            storage_service.create_resource(course_id, file_id, resource)
        logger.info(f"Created resource {file_id} with title {title} for course {course_id}")
        return {"fileId": file_id, "fileName": title, "status": "checked_in", "checkedOutBy": None, "url": url}
    except CourseNotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error creating resource for course {course_id}: {str(e)}")
        raise OpenAIError(f"Failed to create resource: {str(e)}")

# --- File Management Helpers ---
def _upload_file_to_openai(file: UploadFile) -> str:
    """Upload file to OpenAI with proper filename and extension"""
    try:
        # Reset file pointer to beginning
        file.file.seek(0)
        
        # Ensure the file has a proper name with extension
        filename = file.filename or "unknown_file"
        if not filename or '.' not in filename:
            # If no extension, try to infer from content type
            if file.content_type == 'application/pdf':
                filename = f"document.pdf"
            elif file.content_type and file.content_type.startswith('text/'):
                filename = f"document.txt"
            else:
                filename = f"document.bin"
        
        logger.info(f"Uploading file to OpenAI: {filename} (content_type: {file.content_type})")
        
        # Create a new BytesIO object with the proper filename
        file_content = file.file.read()
        file_obj = BytesIO(file_content)
        file_obj.name = filename  # Set the filename for OpenAI
        
        openai_file = client.files.create(
            file=file_obj,
            purpose="assistants"
        )
        
        logger.info(f"Successfully uploaded file to OpenAI: {filename} -> {openai_file.id}")
        return openai_file.id
    except Exception as e:
        logger.error(f"Error uploading file {file.filename} to OpenAI: {str(e)}")
        raise

def _upload_file_to_local(file: UploadFile, course_id: str, file_id: str) -> str:
    """Upload file to local storage and return the local file path"""
    try:
        # Create course directory structure
        course_dir = LOCAL_STORAGE_DIR / "courses" / course_id / "resources" / file_id
        course_dir.mkdir(parents=True, exist_ok=True)
        
        # Reset file pointer to beginning
        file.file.seek(0)
        
        # Create local file path
        filename = file.filename or "unknown_file"
        local_file_path = course_dir / filename
        
        # Save file to local storage
        with open(local_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Log to Firebase
        logger.info(f"Uploaded file {file.filename} to local storage: {local_file_path}")
        
        # Return local file path as string
        return str(local_file_path)
    except Exception as e:
        logger.error(f"Error uploading file to local storage: {str(e)}")
        raise

def _get_file_from_local(local_path: str) -> Optional[BytesIO]:
    """Get file content from local storage"""
    try:
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                file_content = f.read()
            file_obj = BytesIO(file_content)
            file_obj.name = os.path.basename(local_path)
            return file_obj
        else:
            logger.warning(f"Local file not found: {local_path}")
            return None
    except Exception as e:
        logger.error(f"Error reading file from local storage: {str(e)}")
        return None

def _delete_file_from_local(local_path: str):
    """Delete file from local storage"""
    try:
        if os.path.exists(local_path):
            os.remove(local_path)
            logger.info(f"Deleted local file: {local_path}")
        else:
            logger.warning(f"Local file not found for deletion: {local_path}")
    except Exception as e:
        logger.error(f"Error deleting local file: {str(e)}")

def _check_file_compatibility(file_ids: list[str]) -> list[str]:
    """Check which files are compatible with OpenAI file search and return only compatible ones"""
    compatible_files = []
    for file_id in file_ids:
        try:
            file_info = client.files.retrieve(file_id)
            # Check if file has a proper extension
            if file_info.filename and '.' in file_info.filename:
                compatible_files.append(file_id)
                logger.info(f"File {file_id} ({file_info.filename}) is compatible with file search")
            else:
                logger.warning(f"File {file_id} ({file_info.filename}) has no extension and is not compatible with file search")
        except Exception as e:
            logger.error(f"Error checking file {file_id}: {str(e)}")
    return compatible_files

def _add_files_to_assistant(assistant_id: str, file_ids: list[str]):
    """Add files to assistant's file search capability"""
    try:
        # Filter for compatible files only
        compatible_files = _check_file_compatibility(file_ids)
        
        if not compatible_files:
            logger.warning("No compatible files found for file search")
            return
        
        # Enable file_search tool
        client.beta.assistants.update(
            assistant_id=assistant_id,
            tools=[{"type": "file_search"}]
        )
        logger.info(f"Added file_search tool to assistant {assistant_id}")
        
        # Note: In OpenAI API v2, files are attached to threads, not directly to assistants
        # The file_search tool will work with files that are attached to the thread
        logger.info(f"Files {compatible_files} will be available when attached to threads")
        
    except Exception as e:
        logger.error(f"Error adding file_search tool to assistant: {str(e)}")
        raise

def _remove_file_from_assistant(assistant_id: str):
    """Remove file_search tool from assistant"""
    try:
        client.beta.assistants.update(
            assistant_id=assistant_id,
            tools=[]
        )
        logger.info(f"Removed file_search tool from assistant {assistant_id}")
    except Exception as e:
        logger.error(f"Error removing file_search tool from assistant: {str(e)}")
        raise

def _attach_files_to_thread(thread_id: str, file_ids: list[str]):
    """Attach files to a thread for file search"""
    try:
        # Create a single message with all file attachments
        if file_ids:
            attachments = []
            for file_id in file_ids:
                # Verify file exists first
                try:
                    file_info = client.files.retrieve(file_id)
                    logger.info(f"File {file_id} exists: {file_info.filename}")
                    attachments.append({"file_id": file_id, "tools": [{"type": "file_search"}]})
                except Exception as e:
                    logger.error(f"File {file_id} not found: {str(e)}")
                    continue
            
            if attachments:
                client.beta.threads.messages.create(
                    thread_id=thread_id,
                    role="user",
                    content="I'm attaching reference files for this conversation.",
                    attachments=attachments
                )
                logger.info(f"Attached {len(attachments)} files to thread {thread_id}")
            else:
                logger.warning("No valid files to attach to thread")
        else:
            logger.info("No files to attach to thread")
    except Exception as e:
        logger.error(f"Error attaching files to thread: {str(e)}")
        raise

def _remove_file_from_thread(thread_id: str, file_id: str):
    """Remove a specific file from a thread by creating a message that overrides it"""
    try:
        # Note: OpenAI doesn't have a direct way to remove files from threads
        # We'll add a system message indicating this file should not be used
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content="Please ignore the previously attached file as it has been checked out and is no longer available for reference."
        )
        logger.info(f"Added message to thread {thread_id} to ignore file {file_id}")
    except Exception as e:
        logger.error(f"Error removing file from thread: {str(e)}")
        raise

def _get_checked_out_files_prompt(course_id: str, user_id: str) -> str:
    """Generate a system prompt listing checked-out files that should not be used"""
    try:
        resources = storage_service.get_resources(course_id, user_id=user_id)
        checked_out_files = [
            r.get("title", "Unknown file")
            for r in resources
            if r["status"] == "checked_out"
        ]
        
        if checked_out_files:
            prompt = f"\n\nIMPORTANT: The following files have been checked out and are NOT available for reference. Do NOT use or reference these files in your responses:\n"
            for filename in checked_out_files:
                prompt += f"- {filename}\n"
            prompt += "\nOnly use the files that are currently attached to this conversation."
            return prompt
        else:
            return ""
    except Exception as e:
        logger.error(f"Error generating checked-out files prompt: {str(e)}")
        return ""

def _refresh_thread_files(course_id: str, thread_id: str, user_id: str):
    """Refresh the thread with current checked-in files and system prompt for checked-out files"""
    try:
        resources = storage_service.get_resources(course_id, user_id=user_id)
        
        # Get checked-in files
        checked_in_files = [
            r.get("openai_file_id")
            for r in resources
            if r["status"] == "checked_in" and r.get("openai_file_id")
        ]
        
        # Get checked-out files for the prompt
        checked_out_files = [
            r.get("title", "Unknown file")
            for r in resources
            if r["status"] == "checked_out"
        ]
        
        # Create system message with current file status
        system_content = "I'm updating the available files for this conversation."
        
        if checked_out_files:
            system_content += f"\n\nIMPORTANT: The following files have been checked out and are NOT available for reference. Do NOT use or reference these files in your responses:\n"
            for filename in checked_out_files:
                system_content += f"- {filename}\n"
            system_content += "\nOnly use the files that are currently attached to this conversation."
        
        # Add system message to thread
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=system_content
        )
        
        # Attach current checked-in files
        if checked_in_files:
            compatible_files = _check_file_compatibility(checked_in_files)
            if compatible_files:
                _attach_files_to_thread(thread_id, compatible_files)
                logger.info(f"Refreshed thread {thread_id} with {len(compatible_files)} checked-in files and {len(checked_out_files)} checked-out files")
            else:
                logger.warning("No compatible files found for thread refresh")
        else:
            logger.info(f"Refreshed thread {thread_id} with {len(checked_out_files)} checked-out files (no checked-in files)")
            
    except Exception as e:
        logger.error(f"Error refreshing thread files: {str(e)}")
        raise

# --- Free Chat Thread Management ---
async def start_free_chat_thread(course_id: str, user_id: str) -> str:
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    thread_id = course.get("brainstorm_thread_id")
    if not thread_id:
        thread = client.beta.threads.create()
        thread_id = thread.id
        course["brainstorm_thread_id"] = thread_id
        storage_service.update_course(course_id, course)
    resources = storage_service.get_resources(course_id, user_id)
    checked_in_files = [
        r.get("openai_file_id")
        for r in resources
        if r["status"] == "checked_in" and r.get("openai_file_id")
    ]
    if checked_in_files:
        _add_files_to_assistant(course["assistant_id"], checked_in_files)
        _attach_files_to_thread(thread_id, checked_in_files)
        logger.info(f"Added {len(checked_in_files)} checked-in files to assistant and thread for free chat")
    else:
        logger.info("No checked-in files found for free chat")
    return thread_id

# --- Resource Upload/Check-in/Check-out ---
async def upload_resources(course_id: str, assistant_id: str, files: List[UploadFile], user_id: str, thread_id: Optional[str] = None) -> list:
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    resources = []
    for file in files:
        file_id = str(uuid4())
        openai_file_id = _upload_file_to_openai(file)
        local_path = _upload_file_to_local(file, course_id, file_id)
        
        resource = {
            "title": file.filename,
            "status": "checked_in",
            "checkedOutBy": None,
            "openai_file_id": openai_file_id,
            "local_path": local_path,
            "file_size": file.size,
            "content_type": file.content_type,
            "created_at": datetime.utcnow().isoformat(),
            "thread_id": thread_id  # Store thread_id if this is an asset-level upload
        }
        
        # Store resource with thread_id if provided (asset-level)
        if thread_id:
            storage_service.create_resource(course_id, file_id, resource, thread_id=thread_id)
            logger.info(f"Asset-level upload: {file.filename} for thread {thread_id}")
        else:
            storage_service.create_resource(course_id, file_id, resource)
            logger.info(f"Course-level upload: {file.filename}")
        
        resources.append({
            "fileId": file_id,
            "fileName": file.filename,
            "status": "checked_in",
            "checkedOutBy": None,
            "local_path": local_path
        })
        logger.info(f"Uploaded file: {file.filename}, ID: {file_id}, OpenAI file: {openai_file_id}, Local path: {local_path}")
    
    # Add all uploaded files to the assistant's file search
    if resources:
        file_ids = [r["openai_file_id"] for r in resources if r.get("openai_file_id")]
        if file_ids:
            _add_files_to_assistant(assistant_id, file_ids)
            logger.info(f"Added {len(file_ids)} files to assistant {assistant_id}")
    
    return resources

async def checkin_resource(course_id: str, assistant_id: str, file_id: str, user_id: str) -> dict:
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    
    # Try to get resource from both course-level and asset-level collections
    resource = storage_service.get_resource(course_id, file_id)
    if not resource:
        # Try to find in asset-level resources
        all_resources = []
        course_resources = storage_service.get_resources(course_id, user_id=user_id)
        all_resources.extend(course_resources)
        
        # Check brainstorm threads for the resource
        try:
            brainstorm_docs = db.collection("courses").document(course_id).collection("brainstorm").stream()
            for thread_doc in brainstorm_docs:
                thread_resources = storage_service.get_resources(course_id, thread_id=thread_doc.id, user_id=user_id)
                all_resources.extend(thread_resources)
        except Exception as e:
            logger.warning(f"Could not search brainstorm threads: {e}")
        
        # Find the resource by file_id
        resource = None
        for res in all_resources:
            if res.get("fileId") == file_id:
                resource = res
                break
        
        if not resource:
            raise ResourceNotFoundError(f"Resource {file_id} not found")
    
    if resource["status"] == "checked_in":
        raise Exception("Resource is already checked in")
    
    # Update resource status
    resource["status"] = "checked_in"
    resource["checkedOutBy"] = None
    resource["updated_at"] = datetime.utcnow().isoformat()
    
    # Update the resource in the correct collection
    thread_id = resource.get("thread_id")
    storage_service.update_resource(course_id, file_id, resource, thread_id=thread_id)
    
    logger.info(f"Checked in resource {resource['title']} (ID: {file_id})")
    
    # Update system prompt to reflect checked-in status
    # Files remain in thread and assistant, only prompt is updated
    # Find the thread that contains this resource
    resource_thread_id = resource.get("thread_id")
    
    # Update assistant's file search with all checked-in files
    await _update_assistant_file_search(course_id, assistant_id, user_id)
    
    # If this is an asset-level resource, update the specific thread's system prompt
    if resource_thread_id:
        # Get all resources (both course and asset level)
        course_resources = storage_service.get_resources(course_id, user_id=user_id)
        asset_resources = storage_service.get_resources(course_id, thread_id=resource_thread_id, user_id=user_id)
        all_resources = course_resources + asset_resources
        
        checked_out_files = [
            r.get("title", "Unknown file")
            for r in all_resources
            if r["status"] == "checked_out"
        ]
        checked_in_files = [
            r.get("title", "Unknown file")
            for r in all_resources
            if r["status"] == "checked_in"
        ]
        
        # Update system prompt based on thread type
        if "brainstorm" in resource_thread_id or course.get("brainstorm_thread_id") == resource_thread_id:
            system_prompt = _generate_brainstorm_system_prompt(checked_in_files, checked_out_files)
            await save_brainstorm_message(course_id, resource_thread_id, {
                "role": "system",
                "content": system_prompt,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "assistant_id": assistant_id
            })
        elif "course_outcomes" in resource_thread_id:
            # For course outcomes, we don't update system prompt as frequently
            # The system prompt is set during session start
            logger.info(f"Resource {resource['title']} checked in for course outcomes thread")
        else:
            # For other thread types, update chat message
            system_prompt = _generate_brainstorm_system_prompt(checked_in_files, checked_out_files)
            await save_chat_message(course_id, resource_thread_id, {
                "role": "system",
                "content": system_prompt,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "assistant_id": assistant_id
            })
        
        logger.info(f"Updated system prompt after checking in {resource['title']}")
    
    return {
        "fileId": file_id,
        "fileName": resource["title"],
        "status": "checked_in",
        "checkedOutBy": None
    }

async def checkout_resource(course_id: str, assistant_id: str, file_id: str, user_id: str) -> dict:
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    
    # Try to get resource from both course-level and asset-level collections
    resource = storage_service.get_resource(course_id, file_id)
    if not resource:
        # Try to find in asset-level resources
        all_resources = []
        course_resources = storage_service.get_resources(course_id, user_id=user_id)
        all_resources.extend(course_resources)
        
        # Check brainstorm threads for the resource
        try:
            brainstorm_docs = db.collection("courses").document(course_id).collection("brainstorm").stream()
            for thread_doc in brainstorm_docs:
                thread_resources = storage_service.get_resources(course_id, thread_id=thread_doc.id, user_id=user_id)
                all_resources.extend(thread_resources)
        except Exception as e:
            logger.warning(f"Could not search brainstorm threads: {e}")
        
        # Find the resource by file_id
        resource = None
        for res in all_resources:
            if res.get("fileId") == file_id:
                resource = res
                break
        
        if not resource:
            raise ResourceNotFoundError(f"Resource {file_id} not found")
    
    if resource["status"] == "checked_out":
        raise Exception("Resource is already checked out")
    
    # Update resource status
    resource["status"] = "checked_out"
    resource["checkedOutBy"] = user_id
    resource["updated_at"] = datetime.utcnow().isoformat()
    
    # Update the resource in the correct collection
    thread_id = resource.get("thread_id")
    storage_service.update_resource(course_id, file_id, resource, thread_id=thread_id)
    
    logger.info(f"Checked out resource {resource['title']} (ID: {file_id})")
    
    # Update system prompt to reflect checked-out status
    # Files remain in thread and assistant, only prompt is updated
    # Find the thread that contains this resource
    resource_thread_id = resource.get("thread_id")
    
    # Update assistant's file search with remaining checked-in files
    await _update_assistant_file_search(course_id, assistant_id, user_id)
    
    # If this is an asset-level resource, update the specific thread's system prompt
    if resource_thread_id:
        # Get all resources (both course and asset level)
        course_resources = storage_service.get_resources(course_id, user_id=user_id)
        asset_resources = storage_service.get_resources(course_id, thread_id=resource_thread_id, user_id=user_id)
        all_resources = course_resources + asset_resources
        
        checked_out_files = [
            r.get("title", "Unknown file")
            for r in all_resources
            if r["status"] == "checked_out"
        ]
        checked_in_files = [
            r.get("title", "Unknown file")
            for r in all_resources
            if r["status"] == "checked_in"
        ]
        
        # Update system prompt based on thread type
        if "brainstorm" in resource_thread_id or course.get("brainstorm_thread_id") == resource_thread_id:
            system_prompt = _generate_brainstorm_system_prompt(checked_in_files, checked_out_files)
            await save_brainstorm_message(course_id, resource_thread_id, {
                "role": "system",
                "content": system_prompt,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "assistant_id": assistant_id
            })
        elif "course_outcomes" in resource_thread_id:
            # For course outcomes, we don't update system prompt as frequently
            # The system prompt is set during session start
            logger.info(f"Resource {resource['title']} checked out for course outcomes thread")
        else:
            # For other thread types, update chat message
            system_prompt = _generate_brainstorm_system_prompt(checked_in_files, checked_out_files)
            await save_chat_message(course_id, resource_thread_id, {
                "role": "system",
                "content": system_prompt,
                "timestamp": datetime.utcnow().isoformat(),
                "user_id": user_id,
                "assistant_id": assistant_id
            })
        
        logger.info(f"Updated system prompt after checking out {resource['title']}")
    
    return {
        "fileId": file_id,
        "fileName": resource["title"],
        "status": "checked_out",
        "checkedOutBy": user_id
    }

# --- Chat Message Saving/Retrieval ---
async def save_chat_message(course_id: str, thread_id: str, message_data: dict):
    storage_service.save_chat_message(course_id, thread_id, message_data)

async def save_brainstorm_message(course_id: str, thread_id: str, message_data: dict):
    """Save a message specifically for brainstorm threads"""
    storage_service.save_brainstorm_message(course_id, thread_id, message_data)

async def save_course_outcomes_message(course_id: str, thread_id: str, message_data: dict):
    """Save a message specifically for course outcomes threads"""
    storage_service.save_course_outcomes_message(course_id, thread_id, message_data)

async def get_chat_history(course_id: str, thread_id: str) -> list:
    return storage_service.get_chat_history(course_id, thread_id)

async def get_course_outcomes_history(course_id: str, thread_id: str) -> list:
    return storage_service.get_course_outcomes_history(course_id, thread_id)

# --- Free Chat Message Handler ---
async def send_message(course_id: str, thread_id: str, message: str, user_id: str) -> str:
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    assistant_id = course.get("assistant_id")
    if not assistant_id:
        raise OpenAIError("Assistant ID not found for course")
    
    logger.info(f"Sending message to thread {thread_id} for course {course_id}")
    
    # Get all resources for this course
    resources = storage_service.get_resources(course_id, user_id=user_id)
    logger.info(f"Found {len(resources)} total resources for course {course_id}")
    
    # Debug: log all resources
    for i, resource in enumerate(resources):
        logger.info(f"Resource {i}: {resource.get('title', 'No title')} - Status: {resource.get('status', 'No status')} - OpenAI ID: {resource.get('openai_file_id', 'No OpenAI ID')}")
    
    # Get checked-in files
    checked_in_files = [
        r.get("openai_file_id")
        for r in resources
        if r["status"] == "checked_in" and r.get("openai_file_id")
    ]
    
    # Get checked-out files for system prompt
    checked_out_files = [
        r.get("title", "Unknown file")
        for r in resources
        if r["status"] == "checked_out"
    ]
    
    # Get checked-in file names for prompt
    checked_in_file_names = [
        r.get("title", "Unknown file")
        for r in resources
        if r["status"] == "checked_in"
    ]
    
    logger.info(f"Found {len(checked_in_files)} checked-in files with OpenAI IDs: {checked_in_files}")
    logger.info(f"Found {len(checked_out_files)} checked-out files: {checked_out_files}")
    
    # Generate system prompt for checked-out files
    system_prompt = _generate_brainstorm_system_prompt(checked_in_file_names, checked_out_files)
    
    # Ensure assistant has file_search tool enabled
    if checked_in_files:
        # First, try to handle any missing or incompatible files
        logger.info("Checking for missing or incompatible files and handling them...")
        handled_file_ids = _handle_missing_files(course_id, user_id)
        
        # Get updated file IDs (either handled or already compatible)
        updated_resources = storage_service.get_resources(course_id, user_id=user_id)
        updated_checked_in_files = [
            r.get("openai_file_id")
            for r in updated_resources
            if r["status"] == "checked_in" and r.get("openai_file_id")
        ]
        
        # Filter for compatible files only
        compatible_files = _check_file_compatibility(updated_checked_in_files)
        if compatible_files:
            _add_files_to_assistant(assistant_id, compatible_files)
            _attach_files_to_thread(thread_id, compatible_files)
            logger.info(f"Ensured {len(compatible_files)} compatible files are available to assistant")
        else:
            logger.warning("No compatible files found for file search")
    else:
        logger.warning("No checked-in files found for this course")
    
    # Add system message with checked-out files prompt if needed
    if system_prompt:
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=f"System instruction: {system_prompt}"
        )
        logger.info("Added system prompt for checked-out files to thread")
    
    await save_chat_message(course_id, thread_id, {
        "role": "user",
        "content": message,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "assistant_id": assistant_id
    })
    
    # Create message with file attachments if files are available
    if checked_in_files:
        # First, try to handle any missing or incompatible files
        logger.info("Checking for missing or incompatible files and handling them...")
        handled_file_ids = _handle_missing_files(course_id, user_id)
        
        # Get updated file IDs (either handled or already compatible)
        updated_resources = storage_service.get_resources(course_id, user_id=user_id)
        updated_checked_in_files = [
            r.get("openai_file_id")
            for r in updated_resources
            if r["status"] == "checked_in" and r.get("openai_file_id")
        ]
        
        # Filter for compatible files only
        compatible_files = _check_file_compatibility(updated_checked_in_files)
        if compatible_files:
            # Attach files to the message using the correct format
            message_response = client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=message,
                attachments=[{"file_id": file_id, "tools": [{"type": "file_search"}]} for file_id in compatible_files]
            )
            logger.info(f"Sent message with {len(compatible_files)} compatible file attachments")
        else:
            # Send message without attachments if no compatible files
            message_response = client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=message
            )
            logger.warning("No compatible files found, sending message without attachments")
    else:
        message_response = client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=message
        )
    
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id
    )
    
    logger.info(f"Created run {run.id} for thread {thread_id}")
    
    while True:
        run_status = client.beta.threads.runs.retrieve(
            thread_id=thread_id,
            run_id=run.id
        )
        if run_status.status == "completed":
            break
        elif run_status.status == "failed":
            raise OpenAIError(f"Assistant run failed: {run_status.last_error}")
        time.sleep(1)
    
    messages = client.beta.threads.messages.list(thread_id=thread_id)
    latest_message = next((msg for msg in messages.data if msg.role == "assistant"), None)
    response = ""
    if latest_message:
        for content in latest_message.content:
            if content.type == "text":
                response += content.text.value
    
    if response:
        await save_chat_message(course_id, thread_id, {
            "role": "assistant",
            "content": response,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "assistant_id": assistant_id
        })
        logger.info(f"Assistant response saved for thread {thread_id}: {response[:100]}...")
    else:
        logger.warning(f"No assistant response received for thread {thread_id}")
    
    return response

async def send_brainstorm_message(course_id: str, thread_id: str, message: str, user_id: str) -> str:
    """
    Send a message to a brainstorm thread and save messages to brainstorm collection
    """
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    assistant_id = course.get("assistant_id")
    if not assistant_id:
        raise OpenAIError("Assistant ID not found for course")
    
    logger.info(f"Sending brainstorm message to thread {thread_id} for course {course_id}")
    
    # Get all resources (both course and asset level) for system prompt
    course_resources = storage_service.get_resources(course_id, user_id=user_id)
    asset_resources = storage_service.get_resources(course_id, thread_id=thread_id, user_id=user_id)
    all_resources = course_resources + asset_resources
    
    # Get checked-in and checked-out files for system prompt
    checked_in_file_names = [
        r.get("title", "Unknown file")
        for r in all_resources
        if r["status"] == "checked_in"
    ]
    checked_out_files = [
        r.get("title", "Unknown file")
        for r in all_resources
        if r["status"] == "checked_out"
    ]
    
    logger.info(f"Found {len(checked_in_file_names)} checked-in files: {checked_in_file_names}")
    logger.info(f"Found {len(checked_out_files)} checked-out files: {checked_out_files}")
    
    # Generate system prompt for checked-out files
    system_prompt = _generate_brainstorm_system_prompt(checked_in_file_names, checked_out_files)
    
    # Ensure all checked-in files are attached to the thread
    if checked_in_file_names:
        logger.info(f"Adding {len(checked_in_file_names)} checked-in files to assistant and thread")
        await add_checked_in_files_to_assistant(course_id, user_id, thread_id)
    else:
        logger.warning("No checked-in files found to add to assistant")
    
    # Save user message to brainstorm collection
    await save_brainstorm_message(course_id, thread_id, {
        "role": "user",
        "content": message,
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "assistant_id": assistant_id
    })
    
    # Add system prompt to thread if there are checked-out files
    if checked_out_files:
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=f"System instruction: {system_prompt}"
        )
        logger.info("Added system prompt for checked-out files to brainstorm thread")
    
    # Create message in OpenAI thread with file attachments if available
    if checked_in_file_names:
        # Get the file IDs for attachment
        checked_in_file_ids = [
            r.get("openai_file_id")
            for r in all_resources
            if r["status"] == "checked_in" and r.get("openai_file_id")
        ]
        
        # Filter for compatible files
        compatible_files = _check_file_compatibility(checked_in_file_ids)
        logger.info(f"Found {len(compatible_files)} compatible files out of {len(checked_in_file_ids)} checked-in files")
        
        if compatible_files:
            logger.info(f"Attaching files to message: {compatible_files}")
            message_response = client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=message,
                attachments=[{"file_id": file_id, "tools": [{"type": "file_search"}]} for file_id in compatible_files]
            )
            logger.info(f"Sent brainstorm message with {len(compatible_files)} file attachments")
        else:
            message_response = client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=message
            )
            logger.warning("No compatible files found for brainstorm message")
    else:
        message_response = client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=message
        )
    
    # Create run
    run = client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id
    )
    
    logger.info(f"Created brainstorm run {run.id} for thread {thread_id}")
    
    # Wait for completion
    while True:
        run_status = client.beta.threads.runs.retrieve(
            thread_id=thread_id,
            run_id=run.id
        )
        if run_status.status == "completed":
            break
        elif run_status.status == "failed":
            raise OpenAIError(f"Assistant run failed: {run_status.last_error}")
        time.sleep(1)
    
    # Get assistant response
    messages = client.beta.threads.messages.list(thread_id=thread_id)
    latest_message = next((msg for msg in messages.data if msg.role == "assistant"), None)
    response = ""
    if latest_message:
        for content in latest_message.content:
            if content.type == "text":
                response += content.text.value
    
    if response:
        # Save assistant response to brainstorm collection
        await save_brainstorm_message(course_id, thread_id, {
            "role": "assistant",
            "content": response,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "assistant_id": assistant_id
        })
        logger.info(f"Brainstorm assistant response saved for thread {thread_id}: {response[:100]}...")
    else:
        logger.warning(f"No brainstorm assistant response received for thread {thread_id}")
    
    return response

async def send_course_outcomes_message(course_id: str, thread_id: str, message: str, user_id: str) -> str:
    """
    Send a message in a course outcomes thread and get AI response.
    """
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found")
        
        assistant_id = course.get("assistant_id")
        if not assistant_id:
            raise Exception("Course assistant not found")
        
        # Save user message
        await save_course_outcomes_message(course_id, thread_id, {
            "role": "user",
            "content": message,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "assistant_id": assistant_id
        })
        
        # Get the OpenAI thread (should already exist since we create it properly now)
        try:
            openai_thread = client.beta.threads.retrieve(thread_id)
        except Exception as e:
            logger.error(f"Failed to retrieve OpenAI thread {thread_id}: {str(e)}")
            raise Exception(f"Thread {thread_id} not found in OpenAI")
        
        # Add user message to thread
        client.beta.threads.messages.create(
            thread_id=openai_thread.id,
            role="user",
            content=message
        )
        
        # Run the assistant
        run = client.beta.threads.runs.create(
            thread_id=openai_thread.id,
            assistant_id=assistant_id
        )
        
        # Wait for completion
        while True:
            run_status = client.beta.threads.runs.retrieve(
                thread_id=openai_thread.id,
                run_id=run.id
            )
            if run_status.status == "completed":
                break
            elif run_status.status == "failed":
                raise Exception(f"OpenAI run failed: {run_status.last_error}")
            elif run_status.status in ["cancelled", "expired"]:
                raise Exception(f"OpenAI run {run_status.status}")
            time.sleep(1)
        
        # Get the response
        messages = client.beta.threads.messages.list(thread_id=openai_thread.id)
        latest_message = messages.data[0]  # Most recent message
        
        if latest_message.role != "assistant":
            raise Exception("No assistant response received")
        
        response_content = ""
        for content in latest_message.content:
            if content.type == "text":
                response_content += content.text.value
            elif content.type == "image_file":
                response_content += f"[Image: {content.image_file.file_id}]\n"
        
        # Save assistant response
        await save_course_outcomes_message(course_id, thread_id, {
            "role": "assistant",
            "content": response_content,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "assistant_id": assistant_id
        })
        
        return response_content
        
    except Exception as e:
        logger.error(f"Error sending course outcomes message: {str(e)}")
        raise

async def add_checked_in_files_to_assistant(course_id: str, user_id: str, thread_id: str):
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    
    logger.info(f"Adding checked-in files to assistant for course {course_id}, thread {thread_id}")
    
    # Get both course-level and asset-level resources
    course_resources = storage_service.get_resources(course_id, user_id=user_id)
    asset_resources = storage_service.get_resources(course_id, thread_id=thread_id, user_id=user_id)
    
    # Combine all resources
    all_resources = course_resources + asset_resources
    logger.info(f"Found {len(all_resources)} total resources for course {course_id} (course: {len(course_resources)}, asset: {len(asset_resources)})")
    
    # Debug: log all resources
    for i, resource in enumerate(all_resources):
        resource_type = "asset" if resource.get("thread_id") else "course"
        logger.info(f"Resource {i} ({resource_type}): {resource.get('title', 'No title')} - Status: {resource.get('status', 'No status')} - OpenAI ID: {resource.get('openai_file_id', 'No OpenAI ID')}")
    
    checked_in_file_ids = [
        r.get("openai_file_id")
        for r in all_resources
        if r["status"] == "checked_in" and r.get("openai_file_id")
    ]
    
    logger.info(f"Found {len(checked_in_file_ids)} checked-in files with OpenAI IDs: {checked_in_file_ids}")
    
    if checked_in_file_ids:
        # First, try to handle any missing or incompatible files
        logger.info("Checking for missing or incompatible files and handling them...")
        handled_file_ids = _handle_missing_files(course_id, user_id, thread_id)
        
        # Get updated file IDs (either handled or already compatible)
        updated_course_resources = storage_service.get_resources(course_id, user_id=user_id)
        updated_asset_resources = storage_service.get_resources(course_id, thread_id=thread_id, user_id=user_id)
        updated_all_resources = updated_course_resources + updated_asset_resources
        
        updated_checked_in_file_ids = [
            r.get("openai_file_id")
            for r in updated_all_resources
            if r["status"] == "checked_in" and r.get("openai_file_id")
        ]
        
        # Filter for compatible files only
        compatible_files = _check_file_compatibility(updated_checked_in_file_ids)
        if compatible_files:
            _add_files_to_assistant(course["assistant_id"], compatible_files)
            _attach_files_to_thread(thread_id, compatible_files)
            logger.info(f"Added {len(compatible_files)} compatible checked-in files to assistant and attached to thread")
        else:
            logger.warning("No compatible files found to add to assistant")
    else:
        logger.info("No checked-in files found to add to assistant")
    return {"added_file_ids": checked_in_file_ids}

async def delete_resources(course_id: str, assistant_id: str, user_id: str):
    """
    Delete all resources for a course, remove their OpenAI files from the assistant and OpenAI storage, 
    clear them from storage_service, and clean up local files.
    """
    course = storage_service.get_course(course_id, user_id)
    if not course:
        raise CourseNotFoundError(f"Course {course_id} not found")
    
    resources = storage_service.get_resources(course_id, user_id)
    openai_file_ids = [r.get("openai_file_id") for r in resources if r.get("openai_file_id")]
    
    # Remove files from assistant
    if openai_file_ids:
        # Remove all files from assistant
        client.beta.assistants.update(
            assistant_id=assistant_id,
            tool_resources=None
        )
        # Delete files from OpenAI storage
        for file_id in openai_file_ids:
            try:
                client.files.delete(file_id)
            except Exception as e:
                logger.warning(f"Failed to delete OpenAI file {file_id}: {e}")
    
    # Clean up local files
    for resource in resources:
        local_path = resource.get("local_path", "")
        _delete_file_from_local(local_path)
    
    # Delete all resources from storage
    storage_service.delete_all_resources(course_id)
    logger.info(f"Deleted all resources for course {course_id}")

async def delete_single_resource(course_id: str, file_id: str, user_id: str):
    """
    Delete a single resource, remove it from OpenAI storage, local storage, and database.
    Also update the assistant's file search to exclude the deleted file.
    """
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found")
        
        # Get the resource details
        resource = storage_service.get_resource(course_id, file_id)
        if not resource:
            raise Exception(f"Resource {file_id} not found")
        
        openai_file_id = resource.get("openai_file_id")
        local_path = resource.get("local_path", "")
        thread_id = resource.get("thread_id")
        
        # Remove from OpenAI storage if it exists
        if openai_file_id:
            try:
                client.files.delete(openai_file_id)
                logger.info(f"Deleted OpenAI file {openai_file_id}")
            except Exception as e:
                logger.warning(f"Failed to delete OpenAI file {openai_file_id}: {e}")
        
        # Remove from local storage if it exists
        if local_path:
            _delete_file_from_local(local_path)
            logger.info(f"Deleted local file {local_path}")
        
        # Remove from database
        storage_service.delete_resource(course_id, file_id, thread_id=thread_id)
        logger.info(f"Deleted resource {file_id} from database")
        
        # Update assistant's file search with remaining files
        await _update_assistant_file_search(course_id, course["assistant_id"], user_id)
        
        return {"message": "Resource deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting resource {file_id}: {str(e)}")
        raise

async def _update_assistant_file_search(course_id: str, assistant_id: str, user_id: str):
    """
    Update the assistant's file search with current checked-in files.
    This ensures deleted files are no longer available for search.
    """
    try:
        # Get all remaining resources
        resources = storage_service.get_resources(course_id, user_id=user_id)
        
        # Get checked-in files
        checked_in_file_ids = [
            r.get("openai_file_id")
            for r in resources
            if r["status"] == "checked_in" and r.get("openai_file_id")
        ]
        
        if checked_in_file_ids:
            # Filter for compatible files
            compatible_files = _check_file_compatibility(checked_in_file_ids)
            if compatible_files:
                # Update assistant with remaining files
                _add_files_to_assistant(assistant_id, compatible_files)
                logger.info(f"Updated assistant file search with {len(compatible_files)} files")
            else:
                # No compatible files, remove file search tool
                _remove_file_from_assistant(assistant_id)
                logger.info("No compatible files remaining, removed file search tool")
        else:
            # No checked-in files, remove file search tool
            _remove_file_from_assistant(assistant_id)
            logger.info("No checked-in files remaining, removed file search tool")
            
    except Exception as e:
        logger.error(f"Error updating assistant file search: {str(e)}")
        raise

def _handle_missing_files(course_id: str, user_id: str, thread_id: Optional[str] = None) -> list[str]:
    """Handle missing or incompatible files by recreating them from local storage"""
    try:
        logger.info(f"Handling missing or incompatible files for course {course_id}")
        
        # Get both course-level and asset-level resources
        course_resources = storage_service.get_resources(course_id, user_id=user_id)
        asset_resources = []
        if thread_id:
            asset_resources = storage_service.get_resources(course_id, thread_id=thread_id, user_id=user_id)
        
        all_resources = course_resources + asset_resources
        new_file_ids = []
        
        for resource in all_resources:
            if resource.get("openai_file_id"):
                try:
                    # Try to get file info from OpenAI
                    file_info = client.files.retrieve(resource["openai_file_id"])
                    
                    # Check if file has proper extension
                    if file_info.filename and '.' in file_info.filename:
                        # File exists and is compatible
                        new_file_ids.append(resource["openai_file_id"])
                        logger.info(f"File {resource['openai_file_id']} exists and is compatible: {file_info.filename}")
                    else:
                        # File exists but has no extension - recreate it
                        logger.info(f"File {resource['openai_file_id']} exists but has no extension ({file_info.filename}), recreating from local storage")
                        new_file_id = _recreate_file_from_local(resource, course_id)
                        if new_file_id:
                            new_file_ids.append(new_file_id)
                        
                except Exception as e:
                    logger.info(f"File {resource['openai_file_id']} is missing, recreating from local storage")
                    new_file_id = _recreate_file_from_local(resource, course_id)
                    if new_file_id:
                        new_file_ids.append(new_file_id)
                    
        logger.info(f"Handled {len(new_file_ids)} files for course {course_id}")
        return new_file_ids
        
    except Exception as e:
        logger.error(f"Error handling missing files: {str(e)}")
        return []

def _recreate_file_from_local(resource: dict, course_id: str) -> Optional[str]:
    """Recreate a file from local storage with proper extension"""
    try:
        # Get local file path
        local_path = resource.get("local_path", "")
        
        # Get file from local storage
        file_obj = _get_file_from_local(local_path)
        
        if file_obj:
            # Ensure the file object has the proper filename with extension
            original_filename = resource.get('title', 'unknown_file')
            if not original_filename or '.' not in original_filename:
                # Add extension based on content type or default
                if original_filename.lower().endswith('.pdf'):
                    original_filename = f"{original_filename}.pdf"
                elif original_filename.lower().endswith('.txt'):
                    original_filename = f"{original_filename}.txt"
                else:
                    original_filename = f"{original_filename}.pdf"  # Default to PDF
            
            file_obj.name = original_filename
            
            # Upload to OpenAI with actual content and proper filename
            new_openai_file = client.files.create(
                file=file_obj,
                purpose="assistants"
            )
            
            # Update the resource with new OpenAI file ID
            resource["openai_file_id"] = new_openai_file.id
            storage_service.update_resource(course_id, resource.get('fileId', 'unknown'), resource)
            
            logger.info(f"Successfully recreated {resource['title']} from local storage as {new_openai_file.id} with filename {original_filename}")
            return new_openai_file.id
        else:
            logger.warning(f"Local file not found for {resource['title']}, creating placeholder")
            # Fallback to placeholder if local file not found
            original_filename = resource.get('title', 'unknown_file')
            if not original_filename or '.' not in original_filename:
                original_filename = f"{original_filename}.pdf"
            
            file_content = f"File: {resource['title']}\nThis file was re-created with proper extension.\nOriginal content is not available."
            file_obj = BytesIO(file_content.encode('utf-8'))
            file_obj.name = original_filename
            
            new_openai_file = client.files.create(
                file=file_obj,
                purpose="assistants"
            )
            
            resource["openai_file_id"] = new_openai_file.id
            storage_service.update_resource(course_id, resource.get('fileId', 'unknown'), resource)
            logger.info(f"Created placeholder file {resource['title']} as {new_openai_file.id} with filename {original_filename}")
            return new_openai_file.id
            
    except Exception as e:
        logger.error(f"Error recreating file {resource.get('title', 'unknown')}: {str(e)}")
        return None

def _generate_brainstorm_system_prompt(checked_in_files, checked_out_files):
    file_names = ', '.join(checked_in_files) if checked_in_files else 'No files currently checked in.'
    
    # Create checked-out files section with specific instructions
    checked_out_section = ''
    if checked_out_files:
        checked_out_section = '\n\nCHECKED-OUT FILES (NOT ACCESSIBLE):\n'
        for filename in checked_out_files:
            checked_out_section += f"- {filename}\n"
        checked_out_section += '\nIMPORTANT RULES FOR CHECKED-OUT FILES:\n'
        checked_out_section += '1. Do NOT use, reference, or mention checked-out files in your responses\n'
        checked_out_section += '2. If the user specifically asks about a checked-out file, respond with: "I do not have access to this file. Please check it in first to make it available for reference."\n'
        checked_out_section += '3. If the user asks general questions that might involve checked-out files, only use the available checked-in files\n'
        checked_out_section += '4. Do not attempt to provide information from checked-out files, even if you think you might know the content\n'
        checked_out_section += '5. Always prioritize checked-in files for any file-related queries\n'
    
    prompt = f"""Please assist instructors at a liberal STEM university, focusing on project-based learning, by providing brainstorming help and answering questions related to their courses, also known as \"sprints.\"\n\nUniversity Context:\n- Each sprint is 13 days long, with 6 hours of learning per day.\n- Formative assessments include activities (40 marks), quizzes (30 marks), peer evaluation (15 marks), and viva (15 marks).\n- Summative assessments consist of a project (50 marks) and an assessment of essential concepts (an exam worth 50 marks).\n\nYour Role:\n- Engage with users by answering questions and providing brainstorming support.\n- Proactively ask clarifying questions when necessary.\n- Use available reference documents for accurate and relevant assistance.\n\n# Steps\n- Collaborate with instructors to develop ideas and solutions tailored to their courses. Maintain alignment with the University Context.\n- Use provided reference documents to ensure accurate recommendations.\n- Handle file access requests appropriately based on file status.\n\n# Output Format\nProvide responses in a conversational format, using clear and concise language. Include questions and suggestions as needed to guide the user effectively.\n\n# File Access Rules\n- Only use files that are currently checked in and available\n- When asked about checked-out files, inform the user they need to check them in first\n- Focus on available resources and suggest alternatives when needed\n\n# Notes\nEnsure that your assistance aligns with the university's project-based learning model and supports the instructors' goals in both teaching and assessments.\n\nAVAILABLE REFERENCE DOCUMENTS: {file_names}{checked_out_section}"""
    return prompt