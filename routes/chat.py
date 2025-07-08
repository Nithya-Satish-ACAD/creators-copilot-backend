from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from typing import List, Optional
from backend.utils.storage_course import storage_service
from backend.utils import openai_service
from backend.utils.exceptions import handle_course_error, CourseNotFoundError
from firebase_admin import auth as admin_auth
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic Models
class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class ThreadResponse(BaseModel):
    thread_id: str

class MessagesResponse(BaseModel):
    messages: List[dict]

class BrainstormRequest(BaseModel):
    message: str

# Dependency for token verification
def verify_token(authorization: str = Header(...)) -> str:
    try:
        decoded_token = admin_auth.verify_id_token(authorization.replace("Bearer ", ""))
        return decoded_token['uid']
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# RESTful Chat Endpoints
@router.post("/courses/{course_id}/threads", response_model=ThreadResponse)
async def create_chat_thread(course_id: str, user_id: str = Depends(verify_token)):
    """
    Create a new chat thread for a course
    """
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found for user {user_id}")
        
        thread = openai_service.client.beta.threads.create()
        thread_id = thread.id
        
        # Store thread reference in course
        course["free_chat_thread_id"] = thread_id
        storage_service.update_course(course_id, course)
        
        # Add all checked-in course resources to the thread
        await openai_service.add_checked_in_files_to_assistant(course_id, user_id, thread_id)
        
        return ThreadResponse(thread_id=thread_id)
    except Exception as e:
        logger.error(f"Exception in create_chat_thread: {e}")
        raise handle_course_error(e)

@router.post("/courses/{course_id}/brainstorm/threads", response_model=ThreadResponse)
async def create_brainstorm_thread(course_id: str, user_id: str = Depends(verify_token)):
    """
    Create a new brainstorm thread for a course
    """
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found for user {user_id}")
        
        thread = openai_service.client.beta.threads.create()
        thread_id = thread.id
        
        # Save thread ID in course document for persistence
        course["brainstorm_thread_id"] = thread_id
        storage_service.update_course(course_id, course)
        
        # Create a new asset-named collection and document for the thread
        storage_service.create_asset_thread(course_id, "brainstorm", thread_id)
        
        # Add all checked-in course resources to the thread
        await openai_service.add_checked_in_files_to_assistant(course_id, user_id, thread_id)
        
        logger.info(f"Created brainstorm thread {thread_id} for course {course_id}")
        return ThreadResponse(thread_id=thread_id)
    except Exception as e:
        logger.error(f"Exception in create_brainstorm_thread: {e}")
        raise handle_course_error(e)

@router.get("/courses/{course_id}/threads/{thread_id}/messages", response_model=MessagesResponse)
async def get_chat_messages(course_id: str, thread_id: str, user_id: str = Depends(verify_token)):
    """
    Get chat messages for a specific thread
    """
    try:
        messages = await openai_service.get_chat_history(course_id, thread_id)
        return MessagesResponse(messages=messages)
    except Exception as e:
        logger.error(f"Error fetching chat messages: {str(e)}")
        raise handle_course_error(e)

@router.get("/courses/{course_id}/brainstorm/{thread_id}/messages", response_model=MessagesResponse)
async def get_brainstorm_messages(course_id: str, thread_id: str, user_id: str = Depends(verify_token)):
    """
    Get brainstorm messages for a specific thread
    """
    try:
        messages = storage_service.get_brainstorm_messages(course_id, thread_id, user_id)
        logger.info(f"Fetched {len(messages)} brainstorm messages for course {course_id}, thread {thread_id}")
        return MessagesResponse(messages=messages)
    except Exception as e:
        logger.error(f"Error fetching brainstorm messages: {str(e)}")
        raise handle_course_error(e)

@router.post("/courses/{course_id}/threads/{thread_id}/messages", response_model=ChatResponse)
async def send_chat_message(
    course_id: str, 
    thread_id: str, 
    message: ChatMessage, 
    user_id: str = Depends(verify_token)
):
    """
    Send a message to a chat thread
    """
    try:
        response = await openai_service.send_message(
            course_id=course_id,
            thread_id=thread_id,
            message=message.message,
            user_id=user_id
        )
        logger.info(f"Generated response for thread {thread_id}: {response[:50]}...")
        return ChatResponse(response=response)
    except Exception as e:
        logger.error(f"Error in send_chat_message: {str(e)}")
        raise handle_course_error(e)

@router.post("/courses/{course_id}/brainstorm/{thread_id}/messages", response_model=ChatResponse)
async def send_brainstorm_message(
    course_id: str, 
    thread_id: str, 
    message: BrainstormRequest, 
    user_id: str = Depends(verify_token)
):
    """
    Send a message to a brainstorm thread
    """
    try:
        response = await openai_service.send_brainstorm_message(
            course_id=course_id,
            thread_id=thread_id,
            message=message.message,
            user_id=user_id
        )
        logger.info(f"Generated brainstorm response for thread {thread_id}: {response[:50]}...")
        return ChatResponse(response=response)
    except Exception as e:
        logger.error(f"Error in send_brainstorm_message: {str(e)}")
        raise handle_course_error(e)

# Legacy endpoints for backward compatibility (deprecated)
@router.post("/courses/{course_id}/chat/start-thread")
async def start_free_chat_thread(course_id: str, authorization: str = Header(...)):
    """
    DEPRECATED: Use POST /courses/{course_id}/threads instead
    """
    user_id = verify_token(authorization)
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found for user {user_id}")
        thread_id = course.get("free_chat_thread_id")
        if not thread_id:
            thread = openai_service.client.beta.threads.create()
            thread_id = thread.id
            course["free_chat_thread_id"] = thread_id
            storage_service.update_course(course_id, course)
        resources = storage_service.get_resources(course_id, thread_id=thread_id, user_id=user_id)
        checked_in_files = [
            r.get("openai_file_id")
            for r in resources
            if r["status"] == "checked_in" and r.get("openai_file_id")
        ]
        if checked_in_files:
            tool_resources = {
                "file_search": {
                    "vector_store_ids": checked_in_files
                }
            }
            openai_service._add_files_to_assistant(course["assistant_id"], checked_in_files)
        return {"thread_id": thread_id}
    except Exception as e:
        import traceback
        logger.error(f"Exception in start_free_chat_thread: {e}\n{traceback.format_exc()}")
        raise handle_course_error(e)

@router.post("/generate/brainstorm")
async def free_chat(request: dict, authorization: str = Header(...)):
    """
    DEPRECATED: Use POST /courses/{course_id}/brainstorm/{thread_id}/messages instead
    """
    user_id = verify_token(authorization)
    try:
        response = await openai_service.send_message(
            course_id=request["course_id"],
            thread_id=request["thread_id"],
            message=request["message"],
            user_id=user_id
        )
        logger.info(f"Generated response for thread {request['thread_id']}: {response[:50]}...")
        return ChatResponse(response=response)
    except Exception as e:
        logger.error(f"Error in freechat: {str(e)}")
        raise handle_course_error(e)

@router.post("/courses/{course_id}/chat/create-brainstorm-thread")
async def create_brainstorm_thread_legacy(course_id: str, authorization: str = Header(...)):
    """
    DEPRECATED: Use POST /courses/{course_id}/brainstorm/threads instead
    """
    user_id = verify_token(authorization)
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise CourseNotFoundError(f"Course {course_id} not found for user {user_id}")
        thread = openai_service.client.beta.threads.create()
        thread_id = thread.id
        storage_service.create_asset_thread(course_id, "brainstorm", thread_id)
        return {"thread_id": thread_id}
    except Exception as e:
        import traceback
        logger.error(f"Exception in create_brainstorm_thread: {e}\n{traceback.format_exc()}")
        raise handle_course_error(e)

@router.get("/courses/{course_id}/brainstorm/{thread_id}/messages")
async def get_free_chat_messages(course_id: str, thread_id: str, authorization: str = Header(...)):
    """
    DEPRECATED: Use GET /courses/{course_id}/brainstorm/{thread_id}/messages instead
    """
    user_id = verify_token(authorization)
    try:
        messages = storage_service.get_brainstorm_messages(course_id, thread_id, user_id)
        logger.info(f"Fetched {len(messages)} messages for course {course_id}, thread {thread_id}")
        return {"messages": messages}
    except Exception as e:
        logger.error(f"Error fetching free chat messages: {str(e)}")
        raise handle_course_error(e)

# Debug endpoint (remove in production)
@router.get("/debug/brainstorm/{course_id}/{thread_id}/raw")
async def debug_get_raw_brainstorm_messages(course_id: str, thread_id: str, authorization: str = Header(...)):
    user_id = verify_token(authorization)
    try:
        messages = storage_service.get_brainstorm_messages(course_id, thread_id, user_id)
        logger.info(f"Debug: Fetched {len(messages)} messages for course {course_id}, thread {thread_id}")
        return {"messages": messages, "count": len(messages), "course_id": course_id, "thread_id": thread_id}
    except Exception as e:
        logger.error(f"Debug: Error fetching free chat messages: {str(e)}")
        return {"error": str(e), "course_id": course_id, "thread_id": thread_id}