import Drawing from 'dxf-writer';
import serverless from 'serverless-http';
import express from 'express';
const app = express();

const queryCheck = (
  A,
  B,
  C,
  D,
  E,
  F,
  I,
  H,
  holeConfiguration,
  holeDiameter
) => {
  if (!A || !B || !H) {
    throw new Error('Missing required query parameters');
  }

  if (B >= A) {
    throw new Error(
      'Outside Overall Length (A) must be greater than Outside Overall Width (B)'
    );
  }

  if (H >= A) {
    throw new Error(
      'Cross Section (H) must be less than Outside Overall Length (A)'
    );
  }

  if (H >= B) {
    throw new Error(
      'Cross Section (H) must be less than Outside Overall Width (B)'
    );
  }

  if (H <= 0 || A <= 0 || B <= 0) {
    throw new Error('All dimensions must be greater than zero');
  }
};

app.get('/gasket', (req, res) => {
  const query = req.query;

  const apiKey = query.apiKey;

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).send('Unauthorized');
  }

  const A = query.A; // Outside Overall Length
  const B = query.B; // Outside Overall Width
  const C = query.C; // BDC Long C-C
  const D = query.D; // BDC Short C-C
  const E = query.E; // Hole Spacing Arc C-C
  const F = query.F; // Hole Spacing Run C-C
  const I = query.I; // Transition Spacing From Run to Arc
  const H = query.H; // Cross Section
  const holeConfiguration: 'straddled' | 'centered' = query.holeConfiguration;
  const holeDiameter = query.holeDiameter; // Hole Diameters

  try {
    queryCheck(A, B, C, D, E, F, I, H, holeConfiguration, holeDiameter);
  } catch (e) {
    return res.status(400).send({ message: e.message });
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

  res.setHeader(
    'Content-disposition',
    `attachment; filename=gasket-A${A}B${B}H${H}.dxf`
  );
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
