export type HouseId = "gryffindor" | "slytherin" | "ravenclaw" | "hufflepuff";

export interface House {
  id: HouseId;
  name: string;
  emoji: string;
  colors: {
    primary: string;
    secondary: string;
    glow: string;
    text: string;
  };
  traits: string;
  animal: string;
  element: string;
  founder: string;
  cssClass: string;
}

export const HOUSES: Record<HouseId, House> = {
  gryffindor: {
    id: "gryffindor",
    name: "Gryffindor",
    emoji: "🦁",
    colors: {
      primary: "#d3a625",
      secondary: "#740001",
      glow: "rgba(211, 166, 37, 0.5)",
      text: "#ffd700",
    },
    traits: "Bravery · Nerve · Chivalry",
    animal: "Lion",
    element: "Fire",
    founder: "Godric Gryffindor",
    cssClass: "house-gryffindor",
  },
  slytherin: {
    id: "slytherin",
    name: "Slytherin",
    emoji: "🐍",
    colors: {
      primary: "#2a9d5c",
      secondary: "#1a472a",
      glow: "rgba(42, 157, 92, 0.4)",
      text: "#4ade80",
    },
    traits: "Ambition · Cunning · Resourcefulness",
    animal: "Serpent",
    element: "Water",
    founder: "Salazar Slytherin",
    cssClass: "house-slytherin",
  },
  ravenclaw: {
    id: "ravenclaw",
    name: "Ravenclaw",
    emoji: "🦅",
    colors: {
      primary: "#5c87c9",
      secondary: "#0e1a40",
      glow: "rgba(92, 135, 201, 0.4)",
      text: "#93c5fd",
    },
    traits: "Wit · Wisdom · Creativity",
    animal: "Eagle",
    element: "Air",
    founder: "Rowena Ravenclaw",
    cssClass: "house-ravenclaw",
  },
  hufflepuff: {
    id: "hufflepuff",
    name: "Hufflepuff",
    emoji: "🦡",
    colors: {
      primary: "#ecb939",
      secondary: "#372e29",
      glow: "rgba(236, 185, 57, 0.5)",
      text: "#fbbf24",
    },
    traits: "Loyalty · Patience · Hard Work",
    animal: "Badger",
    element: "Earth",
    founder: "Helga Hufflepuff",
    cssClass: "house-hufflepuff",
  },
};

export const HOUSE_LIST: House[] = Object.values(HOUSES);

export function getHouse(id: string): House | null {
  return HOUSES[id as HouseId] ?? null;
}
