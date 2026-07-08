# Park Soccer

A mobile-first, browser-based soccer game built with vanilla JavaScript, Canvas,
Web Audio, and Vite. It follows the same lightweight principles as the reference
backyard sports project: short sessions, readable cartoon players, one-touch
actions, visible ball movement, and simple arcade rules.

Play the deployed game:
[labairj-ai.github.io/soccergame](https://labairj-ai.github.io/soccergame/)

## Gameplay

- Two short halves between Parkside Kicks and Alley Athletic
- Randomized five-player rosters with Kick, Pace, and Control ratings
- One-tap action selection: Dribble, Pass, or Shoot
- Tap the field to choose space, a passing lane, or a shot target
- Continuous AI positioning, tackling, interceptions, keeper saves, and rebounds
- Mobile portrait canvas layout with a compact scoreboard and control deck
- Web Audio effects for kicks, passes, tackles, saves, whistles, and goals

## Controls

1. Tap **Start Match**.
2. Choose **Dribble**, **Pass**, or **Shoot**.
3. Tap the field to aim the selected action.

Dribble moves the ball carrier into space. Pass selects the teammate nearest the
tap. Shoot aims at the opponent's goal, with player ratings and keeper position
affecting the result.

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## Project Structure

```text
src/
  main.js        Canvas setup, responsive scaling, input, and game loop
  game.js        State machine, entities, possession, AI, scoring, and clock
  ui.js          Scoreboard, controls, and message rendering
  field.js       Soccer field rendering
  characters.js Team rosters, ratings, and player rendering
  sounds.js      Web Audio sound effects
  constants.js   Field geometry, game rules, formations, and states
```

## Deployment

Pushes to `main` trigger the GitHub Actions workflow in
`.github/workflows/deploy.yml`, which builds the project and deploys `dist/` to
GitHub Pages.
