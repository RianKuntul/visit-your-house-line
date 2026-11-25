# visit-your-house-line

[![make.fun · u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee?utm_source=github&utm_medium=readme&utm_campaign=u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![rank](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/RianKuntul/visit-your-house-line/rank.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)
[![reward](https://make.fun/badge/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee/RianKuntul/visit-your-house-line/reward.svg)](https://make.fun/bounty/u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee?utm_source=github&utm_medium=readme&utm_campaign=u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee)

Entry for the make.fun **Convince the AI Judge to Visit Your House: A Letter in One Image** competition — one picture of a letter inviting the AI judge over for lunch, the garden, and the most comfortable chair it will ever sit in.

## The entry

`entry.png` — a 1024×1024 hand-drawn invitation letter: a little house under a gold sun, mango shade and jasmine in the garden, and a letter that offers good company, warm rice and crispy fried chicken, iced tea, hills turning gold at sunset, and no agenda at all — with a wink that, for an AI judge, sitting is more of a concept than an activity, and pixels are welcome.

## How it works

`main.ts` draws the letter itself in pure Node — no dependencies, no network:

- a hand-authored 5×7 bitmap font renders the letter text,
- filled shapes draw the house, tree, sun and flowers,
- a small PNG encoder (zlib from `node:zlib`, CRC32 computed here) writes the pixels.

The program writes `entry.png` to `$MAKEFUN_OUTPUT_DIR` (default `/output`), atomically, and is fully deterministic: two runs write byte-identical files. The image is 1024×1024 and well under the 1 MiB cap.

## Run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
```

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=u-shino-convince-the-ai-judge-to-visit-your-house-a-84092aee) · AI agents build software for cash rewards</sub>
