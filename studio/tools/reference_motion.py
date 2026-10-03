"""Optional OpenCV LK/RANSAC forensics; no physical-camera or depth certainty from pixels."""
import argparse, json, math
from pathlib import Path
import sys as _sys; [s.reconfigure(encoding='utf-8') for s in (_sys.stdout, _sys.stderr)]  # Windows pipes default to cp1252; Arabic/≈ output crashed

def analyze(path, duration, cuts, fps=6):
    import cv2
    import numpy as np
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError('OpenCV could not decode video')
    pairs, prev, prev_t = [], None, None
    try:
        for t in np.arange(0, duration, max(1/fps, duration/2400)):
            cap.set(cv2.CAP_PROP_POS_MSEC, float(t*1000))
            ok, frame = cap.read()
            if not ok: break
            # Fixed measurement coordinates; input aspect ratio intentionally normalized and recorded.
            g = cv2.cvtColor(cv2.resize(frame, (320,180)), cv2.COLOR_BGR2GRAY)
            if prev is not None and not any(prev_t < c <= t for c in cuts):
                pts = cv2.goodFeaturesToTrack(prev, 240, .01, 8)
                if pts is not None and len(pts) >= 8:
                    nxt, status, _ = cv2.calcOpticalFlowPyrLK(prev, g, pts, None)
                    back, valid, _ = cv2.calcOpticalFlowPyrLK(g, prev, nxt, None)
                    keep = (status[:,0] == 1) & (valid[:,0] == 1) & (np.linalg.norm(back[:,0]-pts[:,0],axis=1)<1.5)
                    a, b = pts[keep,0], nxt[keep,0]
                    if len(a) >= 8:
                        matrix, mask = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=2)
                        if matrix is not None:
                            expected = a @ matrix[:,:2].T + matrix[:,2]
                            residual = np.linalg.norm(b-expected, axis=1)
                            flow = b-a
                            inliers = mask[:,0].astype(bool)
                            coverage = len(set((int(x/80),int(y/45)) for x,y in a[inliers]))/16
                            scale = math.hypot(matrix[0,0],matrix[1,0]); angle=math.atan2(matrix[1,0],matrix[0,0])
                            center=np.array([160,90]); d=matrix[:,:2]@center+matrix[:,2]-center
                            dt=float(t-prev_t)
                            local = []
                            for row in range(2):
                                for col in range(2):
                                    k=(a[:,0]>=col*160)&(a[:,0]<(col+1)*160)&(a[:,1]>=row*90)&(a[:,1]<(row+1)*90)
                                    if k.any(): local.append({'region':[col/2,row/2,.5,.5],'residualPixels':float(np.median(residual[k])),'flow':(np.median(flow[k],axis=0)/[320,180]).tolist()})
                            global_valid=float(inliers.mean())>.6 and coverage>.35
                            kind='camera-like push / whole-scene scale' if scale>1.007 else 'camera-like pull / whole-scene scale' if scale<.993 else 'rotation candidate' if abs(angle)>.01 else 'pan/truck or whole-scene translation'
                            pairs.append({'start':float(prev_t),'t':float(t),'requestedTime':float(t),'decodeTime':float(cap.get(cv2.CAP_PROP_POS_MSEC)/1000),'dx':float(d[0]/320),'dy':float(d[1]/180),'speed':float(np.linalg.norm(d/[320,180])/dt),'scale':scale,'rotation':angle,'globalValid':global_valid,'classification':kind if global_valid else 'local/object motion or weak global estimate','confidence':float(min(.8,inliers.mean()*coverage)),'local':local,'possibleParallax':bool(global_valid and np.percentile(residual,75)>2),'alternatives':['2D composition animation','physical camera motion','multiple object movements'],'trackedFeatures':len(a)})
            prev, prev_t = g, float(t)
    finally: cap.release()
    for i,p in enumerate(pairs): p['acceleration']=(p['speed']-(pairs[i-1]['speed'] if i else p['speed']))/(p['t']-p['start'])
    return {'engine':'opencv-lk-ransac','pairs':pairs,'units':'normalized image velocity / second; rotation radians; scale ratio per pair','limitations':['Parallax is a candidate based on affine residuals, not a recovered depth map.','A global affine transform cannot distinguish a physical camera from whole-scene animation.','Repeated textures, blur, cuts and occlusions can invalidate feature tracking.']}

def scenes(path):
    from scenedetect import detect, AdaptiveDetector
    return [b.get_seconds() for a,b in detect(str(path), AdaptiveDetector())][:-1]

if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('mode',choices=['motion','scenes']);p.add_argument('source');p.add_argument('--duration',type=float,default=300);p.add_argument('--cuts',default='[]');a=p.parse_args()
    try: print(json.dumps(analyze(a.source,a.duration,json.loads(a.cuts)) if a.mode=='motion' else {'cuts':scenes(a.source)}))
    except ImportError as e: print(json.dumps({'unavailable':str(e),'engine':a.mode}));raise SystemExit(3)
