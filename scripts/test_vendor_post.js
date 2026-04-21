const fetch = global.fetch || require('node-fetch');

(async () => {
  try {
    const url = 'http://127.0.0.1:8000/api/vendor-applications/';
    const params = new URLSearchParams();
    params.append('full_name', 'Test Vendor Node');
    params.append('email', 'node+vendor@example.com');
    params.append('phone', '1234567890');
    params.append('business_name', 'Node Test Shop');
    params.append('specialization', 'tailoring');
    params.append('location', 'Test City');
    params.append('business_description', 'This is a test vendor application from Node script.');

    const resp = await fetch(url, {
      method: 'POST',
      body: params,
      headers: {
        // URLSearchParams sets the correct content-type automatically in node-fetch; omit for global fetch
      }
    });

    console.log('Status', resp.status);
    const text = await resp.text();
    console.log(text);
  } catch (err) {
    console.error('Request failed', err);
  }
})();
