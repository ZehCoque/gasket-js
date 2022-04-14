import Drawing from 'dxf-writer';
import serverless from 'serverless-http';
import express from 'express';
const app = express();

app.get('/gasket', (req, res, next) => {
  const query = req.query;

  const A = query.A; // Outside Overall Length
  const B = query.B; // Outside Overall Width
  const H = query.H; // Cross Section

  if (!A || !B || !H) {
    return res.status(400).send({ error: 'Missing required parameters' });
  }

  if (B >= A) {
    return res.status(400).send({
      error:
        'Outside Overall Length (A) must be greater than Outside Overall Width (B)',
    });
  }

  if (H >= A) {
    return res.status(400).send({
      error: 'Cross Section (H) must be less than Outside Overall Length (A)',
    });
  }

  if (H >= B) {
    return res.status(400).send({
      error: 'Cross Section (H) must be less than Outside Overall Width (B)',
    });
  }

  if (H <= 0 || A <= 0 || B <= 0) {
    return res
      .status(400)
      .send({ error: 'All dimensions must be greater than zero' });
  }

  const d = new Drawing();

  d.addLayer('gasket', Drawing.ACI.YELLOW, 'CONTINUOUS').setActiveLayer(
    'gasket'
  );

  const arcRadius1 = B / 2;
  const arcXPosition1 = [-A / 2 + arcRadius1, A / 2 - arcRadius1];
  d.drawArc(arcXPosition1[0], 0, arcRadius1, 90, 270);
  d.drawArc(arcXPosition1[1], 0, arcRadius1, -90, 90);
  d.drawLine(arcXPosition1[0], arcRadius1, arcXPosition1[1], arcRadius1);
  d.drawLine(arcXPosition1[0], -arcRadius1, arcXPosition1[1], -arcRadius1);

  const arcRadius2 = arcRadius1 - H / 2;
  const arcXPosition2 = [arcXPosition1[0] + H / 2, arcXPosition1[1] - H / 2];

  d.drawArc(arcXPosition2[0], 0, arcRadius2, 90, 270);
  d.drawArc(arcXPosition2[1], 0, arcRadius2, -90, 90);
  d.drawLine(arcXPosition2[0], arcRadius2, arcXPosition2[1], arcRadius2);
  d.drawLine(arcXPosition2[0], -arcRadius2, arcXPosition2[1], -arcRadius2);

  res.setHeader('Content-disposition', `attachment; filename=gasket.dxf`);
  res.set('Content-Type', 'text/dxf');
  res.status(200).send(d.toDxfString());
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: 'Not Found',
  });
});

const port = 3000;
app.listen(port);
console.log(`listening on http://localhost:${port}`);

module.exports.handler = serverless(app);
