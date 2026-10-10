// Generated from src/lib/util.ts by `npm run functions:shared`. Don't edit: change src/lib/util.ts and run it again.
export const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const COLORS = ['#1F8A70', '#3E5BA9', '#A0740A', '#8A4FA3', '#C2410C', '#0E7490', '#BE185D', '#4D7C0F'];
