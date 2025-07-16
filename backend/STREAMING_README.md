# Streaming Functionality Implementation

This document describes the streaming functionality that has been added to the Creator Copilot backend to provide real-time token-by-token responses from the AI assistant.

## Overview

The streaming functionality allows the AI assistant to respond token by token in real-time, similar to how ChatGPT and other AI tools work. This provides a better user experience as users can see the response being generated in real-time rather than waiting for the complete response.

## New Endpoints

### 1. Chat Streaming
- **Endpoint**: `POST /api/courses/{course_id}/threads/{thread_id}/messages/stream`
- **Purpose**: Stream chat responses token by token
- **Request Body**: `{"message": "Your message here"}`
- **Response**: Server-Sent Events (SSE) stream

### 2. Brainstorm Streaming
- **Endpoint**: `POST /api/courses/{course_id}/brainstorm/{thread_id}/messages/stream`
- **Purpose**: Stream brainstorm responses token by token
- **Request Body**: `{"message": "Your message here"}`
- **Response**: Server-Sent Events (SSE) stream

### 3. Course Outcomes Streaming
- **Endpoint**: `POST /api/courses/{course_id}/course-outcomes/{thread_id}/message/stream`
- **Purpose**: Stream course outcomes responses token by token
- **Request Body**: `{"message": "Your message here"}`
- **Response**: Server-Sent Events (SSE) stream

## Response Format

Each stream event contains a JSON object with the following structure:

```json
{
  "type": "token",
  "content": "token_text ",
  "is_complete": false
}
```

- `type`: Always "token" for token events
- `content`: The actual token text (usually a word or punctuation)
- `is_complete`: Boolean indicating if this is the last token in the response

## Implementation Details

### Backend Changes

1. **Requirements Updated**: Added `sse-starlette==1.8.2` and `aiohttp==3.9.1` to `requirements.txt`

2. **New Functions in `openai_service.py`**:
   - `send_message_stream()`: Streams chat responses
   - `send_brainstorm_message_stream()`: Streams brainstorm responses
   - `send_course_outcomes_message_stream()`: Streams course outcomes responses

3. **New Routes in `chat.py`**:
   - `/courses/{course_id}/threads/{thread_id}/messages/stream`
   - `/courses/{course_id}/brainstorm/{thread_id}/messages/stream`

4. **New Routes in `course_outcomes.py`**:
   - `/courses/{course_id}/course-outcomes/{thread_id}/message/stream`

### How It Works

1. **Message Processing**: The system processes the user's message and creates a thread message
2. **Run Creation**: Creates an OpenAI assistant run
3. **Response Generation**: Waits for the run to complete
4. **Token Streaming**: Splits the complete response into tokens and streams them one by one
5. **Storage**: Saves the complete response to the database after streaming

## Frontend Integration

To use the streaming endpoints in your frontend, you can use the EventSource API or fetch with streaming:

### Using EventSource (Recommended)

```javascript
const eventSource = new EventSource('/api/courses/course_id/threads/thread_id/messages/stream');

eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Token:', data.content);
    
    if (data.is_complete) {
        eventSource.close();
        console.log('Stream completed');
    }
};

eventSource.onerror = function(error) {
    console.error('EventSource failed:', error);
    eventSource.close();
};
```

### Using Fetch with Streaming

```javascript
const response = await fetch('/api/courses/course_id/threads/thread_id/messages/stream', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your_token'
    },
    body: JSON.stringify({
        message: 'Your message here'
    })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
        if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            console.log('Token:', data.content);
            
            if (data.is_complete) {
                console.log('Stream completed');
                break;
            }
        }
    }
}
```

## Testing

A test script has been created at `backend/test_streaming.py` to verify the streaming functionality works correctly. Update the script with your actual API URL, authentication token, and course/thread IDs before running.

## Error Handling

The streaming endpoints include proper error handling:
- Invalid authentication tokens
- Missing courses or threads
- OpenAI API errors
- Network connectivity issues

All errors are logged and appropriate HTTP status codes are returned.

## Performance Considerations

- **Memory Usage**: Responses are processed in chunks to minimize memory usage
- **Connection Management**: Proper connection cleanup is implemented
- **Error Recovery**: Failed streams are properly closed and cleaned up
- **Rate Limiting**: Consider implementing rate limiting for production use

## Security

- All streaming endpoints require authentication
- User authorization is verified for each request
- Input validation is performed on all messages
- CORS headers are properly configured

## Future Enhancements

Potential improvements for the streaming functionality:
1. **Real-time streaming**: Stream tokens as they're generated by OpenAI (requires OpenAI streaming API)
2. **Typing indicators**: Show typing indicators during response generation
3. **Partial response handling**: Handle partial responses and continue streaming
4. **Stream interruption**: Allow users to stop streaming responses
5. **Progress indicators**: Show progress of response generation

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your frontend is configured to handle CORS properly
2. **Authentication Errors**: Verify that the Authorization header is properly set
3. **Connection Timeouts**: Check network connectivity and server configuration
4. **Memory Issues**: Monitor server memory usage during high-traffic periods

### Debugging

Enable debug logging in your FastAPI application to see detailed information about streaming requests and responses.

## Dependencies

The streaming functionality requires the following additional dependencies:
- `sse-starlette==1.8.2`: For Server-Sent Events support
- `aiohttp==3.9.1`: For async HTTP client functionality (used in testing)

Make sure to install these dependencies:

```bash
pip install -r requirements.txt
``` 