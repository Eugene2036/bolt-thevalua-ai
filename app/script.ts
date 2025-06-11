(async () => {
  const apiKey = 'AAPKd8d50e1ebe9340be9646d306e625a2b7WZDHriMtDiM28nkiNuH5G5hmk0xQ_z-fu9EjZVTSli6YU6EBussmrORSn2yKBSZn';

  try {

    const host = 'services5';
    const org_id = 'NWpJ7EeWzR57SE3h';
    const service_name = 'service_e0693d7b817949039b679cf541673cf9';
    const layer_id = '0';
    const token = apiKey;
    const url = `https://${host}.arcgis.com/${org_id}/arcgis/rest/services/${service_name}/FeatureServer/${layer_id}?token=${token}&f=pjson`;

    const result = await fetch(url).then((response) => response.json());
    console.log('result', result);
  } catch (error) {
    console.log('error >>>', error);
  }
})();
