# Reelio Pause

Build a mobile-first web prototype called Reelio, which detects doomscrolling from behaviour and interrupts it.

Show a phone frame containing a generic vertical short-video feed: full-screen cards with abstract gradients and fake captions, swiped up and down. No real brand names or logos.

Nothing appears when a session starts. As the user swipes, compute a live drift score (0–100) from: session length compared with a 9-minute personal baseline, time spent on each card, the share of fast swipes (under 2 seconds), and late-night use. Show it in a small collapsible “how it decides” panel beside the phone.

When the score stays above 70 for 5 cards in a row, show an interruption card between cards: “34 min · ~210 reels. Your usual is 9 min.” with two buttons, Close and Keep going. If the user keeps going, the next interruption needs a 5-second wait before it can be dismissed.

After a session ends, show a one-tap “Was that time well spent?” for 1 in 5 sessions. Add a “demo speed ×10” toggle.

Style: calm, premium,pastel colors, soft typography. Not a generic dashboard.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d2cb0f38-69f4-4393-9130-abfc241d9e3c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
