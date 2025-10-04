import requests
import sys
import json
from datetime import datetime

class FarhaAPITester:
    def __init__(self, base_url="https://smart-assistant-151.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {name}")
        if details:
            print(f"   Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    details = f"Status: {response.status_code}, Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}"
                except:
                    details = f"Status: {response.status_code}, Response: {response.text[:100]}..."
            else:
                try:
                    error_data = response.json()
                    details = f"Expected {expected_status}, got {response.status_code}. Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details = f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}..."

            self.log_test(name, success, details)
            return success, response.json() if success and response.text else {}

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout (30s)")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error - service may be down")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_endpoint(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_mock_session_auth(self):
        """Test session authentication with mock data"""
        # Since we can't actually get a real session ID from Emergent Auth in testing,
        # we'll test the endpoint structure but expect it to fail with proper error handling
        success, response = self.run_test(
            "Session Auth (Mock)",
            "POST",
            "auth/session",
            400,  # Expect 400 for invalid session
            data={"session_id": "mock_session_id_for_testing"}
        )
        
        # This should fail gracefully with proper error message
        return success

    def test_chat_without_auth(self):
        """Test chat endpoint without authentication"""
        success, response = self.run_test(
            "Chat Without Auth",
            "POST",
            "chat",
            401,  # Should require authentication
            data={"message": "Hello F.A.R.H.A", "is_voice": False}
        )
        return success

    def test_user_profile_without_auth(self):
        """Test user profile endpoint without authentication"""
        success, response = self.run_test(
            "User Profile Without Auth",
            "GET",
            "user/profile",
            401  # Should require authentication
        )
        return success

    def test_chat_history_without_auth(self):
        """Test chat history endpoint without authentication"""
        success, response = self.run_test(
            "Chat History Without Auth",
            "GET",
            "chat/history",
            401  # Should require authentication
        )
        return success

    def test_voice_endpoints_without_auth(self):
        """Test voice endpoints without authentication"""
        # Test TTS endpoint
        tts_success, _ = self.run_test(
            "TTS Without Auth",
            "POST",
            "voice/tts",
            401,  # Should require authentication
            data={"text": "Hello world", "voice_id": "21m00Tcm4TlvDq8ikWAM"}
        )
        
        # Test voices endpoint
        voices_success, _ = self.run_test(
            "Voices Without Auth",
            "GET",
            "voice/voices",
            401  # Should require authentication
        )
        
        return tts_success and voices_success

    def test_logout_without_auth(self):
        """Test logout endpoint without authentication"""
        success, response = self.run_test(
            "Logout Without Auth",
            "POST",
            "auth/logout",
            401  # Should require authentication
        )
        return success

    def test_cors_headers(self):
        """Test CORS configuration"""
        try:
            response = requests.options(f"{self.api_url}/health", timeout=10)
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            has_cors = any(cors_headers.values())
            details = f"CORS headers: {cors_headers}" if has_cors else "No CORS headers found"
            self.log_test("CORS Configuration", has_cors, details)
            return has_cors
        except Exception as e:
            self.log_test("CORS Configuration", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting F.A.R.H.A Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic endpoints
        self.test_health_endpoint()
        self.test_cors_headers()
        
        # Test authentication requirements
        self.test_mock_session_auth()
        self.test_chat_without_auth()
        self.test_user_profile_without_auth()
        self.test_chat_history_without_auth()
        self.test_voice_endpoints_without_auth()
        self.test_logout_without_auth()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
        
        # Print detailed results
        print("\n📋 Detailed Results:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if result["details"]:
                print(f"   {result['details']}")

        return self.tests_passed == self.tests_run

def main():
    tester = FarhaAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())