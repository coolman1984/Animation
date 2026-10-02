"""Ground-truth clip for the motion-curve tool: known keyframes, easing and spring, 30 fps, 640x360."""
import math, subprocess, sys
import numpy as np
out = sys.argv[1]; W, H, FPS, DUR = 640, 360, 30, 3.0
def bez(x1, y1, x2, y2, u):
    s = u
    for _ in range(30):
        x = 3*(1-s)**2*s*x1 + 3*(1-s)*s**2*x2 + s**3 - u
        dx = 3*(1-s)**2*x1 + 6*(1-s)*s*(x2-x1) + 3*s**2*(1-x2)
        s = min(1, max(0, s - x/(dx if abs(dx) > 1e-6 else 1e-6)))
    return 3*(1-s)**2*s*y1 + 3*(1-s)*s**2*y2 + s**3
def spring(t, D, bounce):
    w0, z = 2*math.pi/D, 1-bounce
    if t <= 0: return 0.0
    wd = w0*math.sqrt(1-z*z)
    return 1 + math.exp(-z*w0*t)*(-math.cos(wd*t) + (-z*w0/wd)*math.sin(wd*t))
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-c:v', 'libx264', '-crf', '12', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
yy, xx = np.mgrid[0:60, 0:60]
tile = (60 + 160*((xx//10 + yy//10) % 2)).astype(np.uint8); tile[:, :4] = 250; tile[:4, :] = 250
for n in range(int(DUR*FPS)):
    t = n/FPS
    u = min(1, max(0, (t-0.5)/0.8)); x = 100 + 360*bez(0.22, 1, 0.36, 1, u)
    y = 180 - 100*spring(t-1.8, 0.6, 0.3)
    f = np.full((H, W), 20, np.uint8)
    x0, y0 = int(round(x-30)), int(round(y-30)); f[y0:y0+60, x0:x0+60] = tile
    p.stdin.write(f.tobytes())
p.stdin.close(); p.wait()
