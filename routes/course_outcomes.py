from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel
from typing import List, Optional
from backend.utils.storage_course import storage_service
from backend.utils import openai_service
from backend.utils.exceptions import handle_course_error
import logging
from firebase_admin import auth as admin_auth
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()

# Models
class CourseOutcomesRequest(BaseModel):
    course_name: str
    ask_clarifying_questions: bool
    file_names: List[str]

class CourseOutcomesResponse(BaseModel):
    thread_id: str
    message: str
    status: str

class CourseOutcomesMessage(BaseModel):
    role: str
    content: str
    timestamp: str

class CourseOutcomesMessageList(BaseModel):
    messages: List[CourseOutcomesMessage]

class CreateThreadResponse(BaseModel):
    thread_id: str
    status: str

class CourseOutcomesMessageRequest(BaseModel):
    message: str

def verify_token(token: str) -> str:
    try:
        decoded_token = admin_auth.verify_id_token(token.replace("Bearer ", ""))
        return decoded_token['uid']
    except Exception as e:
        logger.error(f"Token verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.post("/courses/{course_id}/course-outcomes/create-thread", response_model=CreateThreadResponse)
async def create_course_outcomes_thread(course_id: str, authorization: str = Header(...)):
    """
    Create a new course outcomes thread immediately (like brainstorm).
    """
    user_id = verify_token(authorization)
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Create a proper OpenAI thread (like brainstorm)
        thread = openai_service.client.beta.threads.create()
        thread_id = thread.id
        
        # Create the course outcomes thread in storage
        storage_service.create_asset_thread(course_id, "course_outcomes", thread_id)
        
        # Add all checked-in course resources to the thread
        await openai_service.add_checked_in_files_to_assistant(course_id, user_id, thread_id)
        
        # Save a welcome message
        await openai_service.save_course_outcomes_message(course_id, thread_id, {
            "role": "assistant",
            "content": "Welcome to Course Outcomes Generator! Please provide the following information to get started:\n\n1. Course Name\n2. Whether to ask clarifying questions (Yes/No)\n3. Any specific file names to reference\n\nYou can enter this information in any format, and I'll help you generate detailed course outcomes.",
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "assistant_id": course.get("assistant_id")
        })
        
        return CreateThreadResponse(
            thread_id=thread_id,
            status="created"
        )
        
    except Exception as e:
        logger.error(f"Error creating course outcomes thread: {str(e)}")
        raise handle_course_error(e)

@router.post("/courses/{course_id}/course-outcomes/start", response_model=CourseOutcomesResponse)
async def start_course_outcomes(course_id: str, request: CourseOutcomesRequest, authorization: str = Header(...)):
    """
    Start a course outcomes generation session with user inputs.
    """
    user_id = verify_token(authorization)
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Create a proper OpenAI thread (like brainstorm)
        thread = openai_service.client.beta.threads.create()
        thread_id = thread.id
        
        # Create the course outcomes thread in storage
        storage_service.create_asset_thread(course_id, "course_outcomes", thread_id)
        
        # Add all checked-in course resources to the thread
        await openai_service.add_checked_in_files_to_assistant(course_id, user_id, thread_id)
        
        # Generate the system prompt with user inputs
        system_prompt = _generate_course_outcomes_system_prompt(
            request.course_name,
            request.ask_clarifying_questions,
            request.file_names
        )
        
        # Save the initial system message
        await openai_service.save_course_outcomes_message(course_id, thread_id, {
            "role": "system",
            "content": system_prompt,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "assistant_id": course.get("assistant_id")
        })
        
        # Send the initial message to start the conversation
        response = await openai_service.send_course_outcomes_message(
            course_id, 
            thread_id, 
            "Please generate course outcomes based on the provided context and guidelines.", 
            user_id
        )
        
        return CourseOutcomesResponse(
            thread_id=thread_id,
            message=response,
            status="started"
        )
        
    except Exception as e:
        logger.error(f"Error starting course outcomes: {str(e)}")
        raise handle_course_error(e)

@router.post("/courses/{course_id}/course-outcomes/{thread_id}/message", response_model=CourseOutcomesResponse)
async def send_course_outcomes_message(
    course_id: str, 
    thread_id: str, 
    request: CourseOutcomesMessageRequest,
    authorization: str = Header(...)
):
    """
    Send a message in the course outcomes thread.
    """
    user_id = verify_token(authorization)
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        response = await openai_service.send_course_outcomes_message(
            course_id, 
            thread_id, 
            request.message, 
            user_id
        )
        
        return CourseOutcomesResponse(
            thread_id=thread_id,
            message=response,
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Error sending course outcomes message: {str(e)}")
        raise handle_course_error(e)

@router.get("/courses/{course_id}/course-outcomes/{thread_id}/messages", response_model=CourseOutcomesMessageList)
async def get_course_outcomes_messages(
    course_id: str, 
    thread_id: str, 
    authorization: str = Header(...)
):
    """
    Get all messages from a course outcomes thread.
    """
    user_id = verify_token(authorization)
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        messages = await openai_service.get_course_outcomes_history(course_id, thread_id)
        
        return CourseOutcomesMessageList(
            messages=[
                CourseOutcomesMessage(
                    role=msg.get("role", ""),
                    content=msg.get("content", ""),
                    timestamp=msg.get("timestamp", "")
                ) for msg in messages
            ]
        )
        
    except Exception as e:
        logger.error(f"Error getting course outcomes messages: {str(e)}")
        raise handle_course_error(e)

@router.get("/courses/{course_id}/course-outcomes/threads")
async def list_course_outcomes_threads(course_id: str, authorization: str = Header(...)):
    """
    List all course outcomes threads for a course.
    """
    user_id = verify_token(authorization)
    try:
        course = storage_service.get_course(course_id, user_id)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        threads = storage_service.get_course_outcomes_threads(course_id, user_id)
        return {"threads": threads}
        
    except Exception as e:
        logger.error(f"Error listing course outcomes threads: {str(e)}")
        raise handle_course_error(e)

def _generate_course_outcomes_system_prompt(course_name: str, ask_clarifying_questions: bool, file_names: List[str]) -> str:
    """
    Generate the system prompt for course outcomes generation.
    """
    file_names_str = ", ".join(file_names) if file_names else "No specific files provided"
    
    prompt = f"""Generate detailed and measurable course outcomes for the course {course_name} aimed at instructors at a liberal STEM university, emphasizing transdisciplinary and project-based learning.

The value of ask_clarifying_questions as input by the user is {ask_clarifying_questions}.
If ask_clarifying_questions is True, begin by asking any necessary clarifying questions to better understand the instructional context, learning goals, or target student profile before generating course outcomes. Only proceed with outcome generation after receiving adequate clarification.
If ask_clarifying_questions is False, proceed directly to generating course outcomes based on the provided materials and context.

Course Outcomes should adhere to the following guidelines:
- Label each outcome sequentially as CO1, CO2, and so on, ensuring a minimum of three outcomes.
- Clearly articulate what students are expected to learn.
- Align with the academic and professional aspirations of students pursuing careers in STEM fields.
- Ensure the outcomes align explicitly and unambiguously with the appropriate sections of the files: {file_names_str}. Use specific language from the document to ensure alignment.

# Output Format

Provide a structured list of 3-5 Course Outcomes, each labeled with CO#:
- Name: [Brief, informative name]
- Description: [Detailed description of expectations, referencing the provided files]
- Bloom's Level(s): [Relevant Bloom's Learning Level(s)]
- Optional - Assessment Ideas: [Suggestions for assessing the outcome]

# Additional Guidelines

1. **Transdisciplinary Focus**: Emphasize connections across different disciplines and real-world applications.
2. **Project-Based Learning**: Include outcomes that reflect hands-on, experiential learning experiences.
3. **Critical Thinking**: Ensure outcomes promote analytical and creative problem-solving skills.
4. **Communication Skills**: Include outcomes that develop both written and oral communication abilities.
5. **Collaboration**: Emphasize teamwork and collaborative learning experiences.
6. **Technology Integration**: Where appropriate, include outcomes related to technology use and digital literacy.
7. **Ethical Considerations**: Include outcomes that address ethical implications and social responsibility.
8. **Global Perspective**: Consider international and cultural dimensions where relevant.
9. **Sustainability**: Include outcomes related to environmental and social sustainability where applicable.
10. **Career Readiness**: Ensure outcomes prepare students for professional success in their chosen fields.

Remember to:
- Use clear, measurable language
- Align with institutional learning goals
- Consider diverse learning styles and backgrounds
- Ensure outcomes are achievable within the course timeframe
- Provide specific, actionable learning objectives
- Reference the provided materials explicitly in your outcomes

Please generate comprehensive course outcomes that reflect these guidelines and the specific context of {course_name}."""
    
    return prompt 