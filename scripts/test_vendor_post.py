import requests

url = 'http://127.0.0.1:8000/api/vendor-applications/'

data = {
    'full_name': 'Test Vendor',
    'email': 'test+vendor@example.com',
    'phone': '1234567890',
    'business_name': 'Test Shop',
    'specialization': 'tailoring',
    'location': 'Test City',
    'business_description': 'Test business description'
}

resp = requests.post(url, data=data)
print('Status', resp.status_code)
print(resp.text)
