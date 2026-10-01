// Plates for source/hero-duo.jpg (1600x1600): cup + carton cut-outs and a clean background plate.
// Coordinates were measured on zoomed grid crops of the source photo.
async ({ hero }) => {
  const img = await lab.load(hero);
  const W = img.width, H = img.height;
  const cupPath = [
    ['M', 707, 812], ['Q', 702, 790, 715, 775], ['L', 735, 762], ['Q', 755, 748, 780, 742],
    ['C', 860, 734, 960, 724, 1080, 705], ['C', 1140, 694, 1190, 694, 1220, 708],
    ['Q', 1255, 725, 1268, 757], ['Q', 1290, 764, 1300, 790], ['Q', 1310, 812, 1300, 822],
    ['Q', 1290, 840, 1262, 848], ['L', 1247, 856], ['L', 1195, 1425], ['L', 1184, 1505],
    ['C', 1150, 1558, 860, 1558, 828, 1505], ['L', 815, 1425], ['L', 762, 856],
    ['L', 745, 848], ['Q', 712, 838, 707, 812], ['Z'],
  ];
  const cartonPath = [
    ['M', 372, 1442], ['L', 372, 242], ['L', 432, 70], ['L', 477, 68], ['L', 478, 60],
    ['Q', 560, 38, 642, 60], ['L', 642, 68], ['L', 672, 70], ['L', 772, 228], ['L', 777, 1442], ['Z'],
  ];
  const cup = lab.pathMask(W, H, cupPath, 1.2);
  const cartonShape = lab.pathMask(W, H, cartonPath, 1.2);
  const cartonVisible = lab.subtract(cartonShape, lab.morph(cup, 2));
  const cartonFill = lab.fillHoles(lab.applyMask(img, cartonVisible), [4, 10, 24, 60]);
  const carton = lab.applyMask(cartonFill, cartonShape);
  const objects = lab.morph(lab.union(cup, cartonShape), 8);
  const bg = lab.fillHoles(lab.applyMask(img, lab.invert(objects)));
  const check = lab.overlay(img, lab.union(cup, cartonShape));
  return {
    'hero-cup': lab.url(lab.applyMask(img, cup)),
    'hero-carton': lab.url(carton),
    'hero-bg': lab.url(bg),
    'hero-cupmask': lab.url(cup),
    'check-hero': lab.url(lab.crop(check, 0, 0, W, H, 0.5)),
    'check-cup-top': lab.url(lab.crop(check, 680, 670, 660, 220, 1)),
    'check-cup-bottom': lab.url(lab.crop(check, 740, 1380, 520, 220, 1)),
    'check-carton-top': lab.url(lab.crop(check, 340, 20, 480, 260, 1)),
  };
}
