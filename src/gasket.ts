import Drawing from 'dxf-writer';
import fs from 'fs';

let d = new Drawing();

d.setUnits('Centimeters');

//or fluent
d.addLayer('l_yellow', Drawing.ACI.YELLOW, 'DOTTED')
  .setActiveLayer('l_yellow')
  .drawCircle(0, 0, 50);

fs.writeFileSync('output/gasket.dxf', d.toDxfString());
