#!/bin/sh
# Rebuild the ffmpeg crops of film 5 (run after copying the four owner images into film5/source/ and `node film5/plates.mjs`).
# source/: hero-duo.jpg (1600²), swing.jpg (1080×1350), storyboard.jpg (987×1759), vintage-board.jpg (1024×1536)
cd "$(dirname "$0")"; S=source/storyboard.jpg; V=source/vintage-board.jpg; P=plates
c() { ffmpeg -v error -y -i "$1" -vf "crop=$2" "$3"; }
cp source/hero-duo.jpg $P/hero-duo.jpg
c $S 587:345:400:5   $P/sb1-macro.jpg
c $S 590:350:395:362 $P/sb2-swing.jpg
c $S 610:306:140:742 $P/sb3-ingred.jpg
c $S 845:332:140:1058 $P/sb4-cafe.jpg
c $V 518:220:12:300  $P/v-mancar.jpg
c $V 215:485:772:60  $P/v-statue.jpg
for spec in 0:118 1:136 2:118 3:118 4:140; do i=${spec%%:*}; w=${spec##*:}
  ffmpeg -v error -y -i $V -vf "crop=$w:185:$((8+i*200+2)):805,scale=iw*3:ih*3:flags=lanczos,unsharp=5:5:0.7" $P/v-card$i.png; done
