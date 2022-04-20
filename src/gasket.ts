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
  if (
    !A ||
    !B ||
    !C ||
    !D ||
    !E ||
    !F ||
    !I ||
    !H ||
    !holeConfiguration ||
    !holeDiameter
  ) {
    throw new Error(
      'Missing required query parameters. All parameters must be greater than 0.'
    );
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
};

app.get('/gasket', (req, res) => {
  const query = req.query;

  const apiKey = query.apiKey;

  if (!apiKey || apiKey !== (process.env.API_KEY || 'localTest')) {
    return res.status(401).send('Unauthorized');
  }

  const A = Number(query.A); // Outside Overall Length
  const B = Number(query.B); // Outside Overall Width
  const C = Number(query.C); // BDC Long C-C
  const D = Number(query.D); // BDC Short C-C
  const E = Number(query.E); // Hole Spacing Arc C-C
  const F = Number(query.F); // Hole Spacing Run C-C
  const I = Number(query.I); // Transition Spacing From Run to Arc
  const H = Number(query.H); // Cross Section
  const holeConfiguration: 'straddled' | 'centered' = query.holeConfiguration;
  const holeDiameter = Number(query.holeDiameter); // Hole Diameters

  try {
    queryCheck(A, B, C, D, E, F, I, H, holeConfiguration, holeDiameter);
  } catch (e) {
    return res.status(400).send({ message: e.message });
  }

  const d = new Drawing();

  d.addLayer('gasket', Drawing.ACI.WHITE, 'CONTINUOUS').setActiveLayer(
    'gasket'
  );

  let holeCount = 0;

  const arcRadius1 = B / 2;
  const arcXPosition1 = [-A / 2 + arcRadius1, A / 2 - arcRadius1];
  d.drawArc(arcXPosition1[0], 0, arcRadius1, 90, 270);
  d.drawArc(arcXPosition1[1], 0, arcRadius1, -90, 90);
  d.drawLine(arcXPosition1[0], arcRadius1, arcXPosition1[1], arcRadius1);
  d.drawLine(arcXPosition1[0], -arcRadius1, arcXPosition1[1], -arcRadius1);

  const arcRadius2 = arcRadius1 - H;
  const arcXPosition2 = [arcXPosition1[0], arcXPosition1[1]];

  d.drawArc(arcXPosition2[0], 0, arcRadius2, 90, 270);
  d.drawArc(arcXPosition2[1], 0, arcRadius2, -90, 90);
  d.drawLine(arcXPosition2[0], arcRadius2, arcXPosition2[1], arcRadius2);
  d.drawLine(arcXPosition2[0], -arcRadius2, arcXPosition2[1], -arcRadius2);

  const arcRadius3 = D / 2;
  const arcXPosition3 = [-C / 2 + arcRadius3, C / 2 - arcRadius3];

  let alpha = 2 * Math.asin(E / D);
  let theta = holeConfiguration === 'straddled' ? Math.PI - alpha / 2 : Math.PI; // TODO: Change if straddled

  const holeRadius = holeDiameter / 2;
  let coordX = arcRadius3 * Math.cos(theta) + arcXPosition3[0];
  let coordY = arcRadius3 * Math.sin(theta);
  d.drawCircle(coordX, coordY, holeRadius);
  holeCount++;
  d.drawCircle(-coordX, -coordY, holeRadius);
  holeCount++;

  if (holeConfiguration === 'straddled') {
    d.drawCircle(coordX, -coordY, holeRadius);
    holeCount++;
    d.drawCircle(-coordX, coordY, holeRadius);
    holeCount++;
  }

  while (theta - alpha >= Math.PI / 2) {
    coordX = arcRadius3 * Math.cos(theta - alpha) + arcXPosition3[0];
    coordY = arcRadius3 * Math.sin(theta - alpha);
    d.drawCircle(coordX, coordY, holeRadius);
    holeCount++;
    d.drawCircle(-coordX, -coordY, holeRadius);
    holeCount++;
    d.drawCircle(-coordX, coordY, holeRadius);
    holeCount++;
    d.drawCircle(coordX, -coordY, holeRadius);
    holeCount++;
    theta -= alpha;
  }

  alpha = 2 * Math.asin(I / D);
  coordX = arcRadius3 * Math.cos(theta - alpha) + arcXPosition3[0];

  const startingRunPosition = coordX;
  while (startingRunPosition < -coordX) {
    d.drawCircle(coordX, arcRadius3, holeRadius);
    holeCount++;
    d.drawCircle(coordX, -arcRadius3, holeRadius);
    holeCount++;

    coordX +=
      F + coordX > -startingRunPosition ? -(startingRunPosition + coordX) : F;
  }

  if (coordX === -startingRunPosition) {
    d.drawCircle(coordX, arcRadius3, holeRadius);
    holeCount++;
    d.drawCircle(coordX, -arcRadius3, holeRadius);
    holeCount++;
  }

  res.setHeader(
    'Content-disposition',
    `attachment; filename=Gasket ${holeCount} Hole A${A} B${B} C${C} D${D} E${E} F${F} I${I} H${H} ${holeConfiguration}.dxf`
  );
  res.set('Content-Type', 'text/dxf');
  res.status(200).send(d.toDxfString());
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: 'Not Found',
  });
});

const port = 5000;
app.listen(port);
console.log(`listening on http://localhost:${port}`);

module.exports.handler = serverless(app);
