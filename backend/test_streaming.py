#!/usr/bin/env python3
"""
Test script for streaming functionality
"""
import asyncio
import json
import aiohttp
import sys

async def test_streaming_endpoint():
    """Test the streaming endpoint"""
    # Replace with your actual API URL and authentication
    base_url = "http://localhost:8000"
    headers = {
        "Authorization": "Bearer YOUR_TOKEN_HERE",  # Replace with actual token
        "Content-Type": "application/json"
    }
    
    # Test data - replace with actual course_id and thread_id
    test_data = {
        "message": "Hello, can you help me with this course?"
    }
    
    # Test regular chat streaming
    chat_url = f"{base_url}/api/courses/YOUR_COURSE_ID/threads/YOUR_THREAD_ID/messages/stream"
    
    print("Testing chat streaming endpoint...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(chat_url, json=test_data, headers=headers) as response:
                if response.status == 200:
                    print("✅ Chat streaming endpoint is working!")
                    print("Streaming response:")
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # Remove 'data: ' prefix
                            try:
                                data = json.loads(data_str)
                                print(f"Token: {data['content']}", end='', flush=True)
                                if data.get('is_complete'):
                                    print("\n✅ Stream completed!")
                            except json.JSONDecodeError:
                                print(f"Invalid JSON: {data_str}")
                else:
                    print(f"❌ Chat streaming failed with status {response.status}")
                    print(await response.text())
    except Exception as e:
        print(f"❌ Error testing chat streaming: {e}")
    
    # Test brainstorm streaming
    brainstorm_url = f"{base_url}/api/courses/YOUR_COURSE_ID/brainstorm/YOUR_THREAD_ID/messages/stream"
    
    print("\nTesting brainstorm streaming endpoint...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(brainstorm_url, json=test_data, headers=headers) as response:
                if response.status == 200:
                    print("✅ Brainstorm streaming endpoint is working!")
                    print("Streaming response:")
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # Remove 'data: ' prefix
                            try:
                                data = json.loads(data_str)
                                print(f"Token: {data['content']}", end='', flush=True)
                                if data.get('is_complete'):
                                    print("\n✅ Stream completed!")
                            except json.JSONDecodeError:
                                print(f"Invalid JSON: {data_str}")
                else:
                    print(f"❌ Brainstorm streaming failed with status {response.status}")
                    print(await response.text())
    except Exception as e:
        print(f"❌ Error testing brainstorm streaming: {e}")
    
    # Test course outcomes streaming
    outcomes_url = f"{base_url}/api/courses/YOUR_COURSE_ID/course-outcomes/YOUR_THREAD_ID/message/stream"
    
    print("\nTesting course outcomes streaming endpoint...")
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(outcomes_url, json=test_data, headers=headers) as response:
                if response.status == 200:
                    print("✅ Course outcomes streaming endpoint is working!")
                    print("Streaming response:")
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # Remove 'data: ' prefix
                            try:
                                data = json.loads(data_str)
                                print(f"Token: {data['content']}", end='', flush=True)
                                if data.get('is_complete'):
                                    print("\n✅ Stream completed!")
                            except json.JSONDecodeError:
                                print(f"Invalid JSON: {data_str}")
                else:
                    print(f"❌ Course outcomes streaming failed with status {response.status}")
                    print(await response.text())
    except Exception as e:
        print(f"❌ Error testing course outcomes streaming: {e}")

if __name__ == "__main__":
    print("🚀 Testing Streaming Functionality")
    print("=" * 50)
    print("Note: Update the script with your actual:")
    print("- API URL (if not localhost:8000)")
    print("- Authentication token")
    print("- Course ID and Thread ID")
    print("=" * 50)
    
    asyncio.run(test_streaming_endpoint()) 