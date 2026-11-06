// Run in DevTools on an authorized page. The result is a snapshot of the active page state.
(() => {
  const fields = [
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color',
    'backgroundColor', 'borderColor', 'borderRadius', 'boxShadow', 'display',
    'position', 'gridTemplateColumns', 'flexDirection', 'gap', 'padding', 'margin',
    'transitionProperty', 'transitionDuration', 'transitionTimingFunction',
    'animationName', 'animationDuration', 'animationTimingFunction', 'transform',
    'clipPath', 'aspectRatio', 'objectFit', 'filter', 'opacity', 'zIndex',
  ];
  const selector = 'header,nav,main,section,article,aside,footer,h1,h2,h3,p,button,a,input,img,video,svg,canvas,[role]';
  const nodes = document.querySelectorAll(selector);
  const elements = [];
  const scanLimit = Math.min(nodes.length, 3000);
  let scanned = 0;
  for (; scanned < scanLimit && elements.length < 300; scanned++) {
    const node = nodes[scanned];
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    if (!rect.width || !rect.height || style.visibility !== 'visible') continue;
    elements.push({
      tag: node.localName,
      role: node.getAttribute('role'),
      viewBox: node.getAttribute('viewBox'),
      background: style.backgroundImage === 'none' ? 'none' :
        /url\(/i.test(style.backgroundImage || '') ? 'image reference' : style.backgroundImage,
      pageBox: [rect.x + scrollX, rect.y + scrollY, rect.width, rect.height].map(Math.round),
      styles: Object.fromEntries(fields.map(field => [field, style[field]])),
    });
  }
  return {
    viewport: { width: innerWidth, height: innerHeight, scrollY, pixelRatio: devicePixelRatio },
    direction: getComputedStyle(document.documentElement).direction,
    declaredFonts: Array.from(document.fonts, font => ({
      family: font.family, weight: font.weight, status: font.status,
    })),
    matched: nodes.length,
    scanned,
    truncated: scanned < nodes.length,
    elements,
  };
})()
