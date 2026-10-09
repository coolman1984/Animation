// One clock for picture and sound (owner order 2026-10-08: the reference music stays exactly as it is, the picture follows it).
// The film was authored on a 115.2 BPM grid; the reference track runs at 117.57 BPM (beat 0.51032 s, measured from 25 drum hits).
// Real time t → film time t·SCALE, so every authored cut/hit lands on the track's own beats. Its first hit plays 12 ms after t = 0.
export const FILM_BEAT = 60 / 115.2, MUSIC_BEAT = 0.51032, SCALE = FILM_BEAT / MUSIC_BEAT, FIRST_HIT = 0.04, LEAD = 0.012;
export const toFilm = (t) => t * SCALE, toReal = (tf) => tf / SCALE;
