(async () => {
  const checkId = '156039a0-bb66-11ee-a936-e3de905e64bc';
  const url = `https://sandbox-paynote.seamlesschex.com/v1/check/:${checkId}`;
  const secretKey = 'sk_test_01HMY0C9KA0KAGJZXSCGM8C4HV';

  try {
    const result = await fetch(url, {
      method: 'get',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    }).then((response) => response.json());
    console.log('result', result);
  } catch (error) {
    console.log(error);
  }
})();
