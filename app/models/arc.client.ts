import FeatureLayer from '@arcgis/core/layers/FeatureLayer';

export async function doTheThing() {
  const layer = new FeatureLayer({
    url: 'https://services5.arcgis.com/NWpJ7EeWzR57SE3h/arcgis/rest/services/service_e0693d7b817949039b679cf541673cf9/FeatureServer/0',
  });
  await layer
    .queryFeatures()
    .then((results) => {
      console.log('rsults', results);
    })
    .catch((error) => {
      console.log(error.error);
    });
  const a = await layer.queryAttachments({ globalIds: [] });
  return JSON.stringify(a);
}
