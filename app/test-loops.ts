(async () => {
  const API_KEY = '';
  const url = 'https://app.loops.so/api/v1/transactional';
  const response = await fetch(url, {
    method: 'post',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: 'clserxjvg00xaym07eb4eg1nl',
      email: 'allansimoyi@gmail.com',
      dataVariables: {
        productName: 'Valua',
        token: 'example_token',
      },
    }),
  }).then((response) => response.json());
  console.log('response', response);
})();
