// Central asset registry. Each physical file is imported exactly once; where
// several export names historically pointed at the same file, they are aliased
// on export below (e.g. Img10 / Img12 / HeroGuaSha all resolve to hero-img.jpg)
// rather than re-imported. Assets live under images/ , videos/ and posters/.

import Img1 from "./images/Img1.jpg";
import Img2 from "./images/Img2.jpg";
import Img3 from "./images/Img3.jpg";
import Img4 from "./images/Img4.jpg";
import Img5 from "./images/Img5.jpg";
import Img6 from "./images/Img6.jpg";
import Img7 from "./images/Img7.jpg";
import Img8 from "./images/Img8.jpg";
import Img9 from "./images/Img9.jpg";
import img12File from "./images/Img12.jpg";

/* Editorial hero frames — warm sand / olive / cream shots, kept out of the
   ImgN series so the mosaics can't pull them and break the hero's palette.
   These are 2000px re-encodes; keep any replacement ≤2000px longest side. */
import heroImg from "./images/hero-img.jpg";
import heroRol from "./images/hero-rol.jpg";
import heroImg2 from "./images/hero-img2.jpg";

/* Reel poster frames — a still grabbed ~1s into each clip, 360px wide. They let
   the reel cards render with `preload="none"`, so the landing page ships none of
   the multi-MB video files until someone actually hovers a card. */
import reelPoster1 from "./posters/reel-poster-1.jpg";
import reelPoster2 from "./posters/reel-poster-2.jpg";
import reelPoster3 from "./posters/reel-poster-3.jpg";
import reelPoster4 from "./posters/reel-poster-4.jpg";
import reelPoster5 from "./posters/reel-poster-5.jpg";

import vid1 from "./videos/video1.mp4";
import vid2 from "./videos/video2.mp4";
import vid3 from "./videos/video3.mp4";
import vid4 from "./videos/video4.mp4";
import vid5 from "./videos/video5.mp4";

export {
  Img1,
  Img2,
  Img3,
  Img4,
  Img5,
  Img6,
  Img7,
  Img8,
  Img9,
  // Aliases onto shared files (unchanged runtime behaviour):
  heroImg as Img10,
  img12File as Img11,
  heroImg as Img12,
  heroRol as HeroRoller,
  heroImg as HeroGuaSha,
  heroImg2 as HeroMirror,
  reelPoster1,
  reelPoster2,
  reelPoster3,
  reelPoster4,
  reelPoster5,
  vid1,
  vid2,
  vid3,
  vid4,
  vid5,
};
