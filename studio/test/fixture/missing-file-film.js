// Fixture (audit R4): a film whose init asks for a file that does not exist; the render must fail and name it.
export default { duration: 1, fps: 30, async init(stage) { await fetch('/test/fixture/no-such-data.json'); stage.style.background = '#123'; }, render() {} };
