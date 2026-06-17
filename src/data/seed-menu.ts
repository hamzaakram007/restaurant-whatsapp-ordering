import type { MenuCategory, MenuItem } from "@/lib/types";

export const seedCategories: MenuCategory[] = [
  { id: "coffee", name: "Coffee", sortOrder: 1 },
  { id: "tea", name: "Tea", sortOrder: 2 },
  { id: "breakfast", name: "Breakfast", sortOrder: 3 },
  { id: "burgers", name: "Burgers", sortOrder: 4 },
  { id: "desserts", name: "Desserts", sortOrder: 5 },
];

const sizeGroup = (
  choices: { id: string; label: string; priceDeltaCents: number }[],
) => ({
  id: "size",
  name: "Size",
  required: true,
  choices,
});

export const seedMenuItems: MenuItem[] = [
  {
    id: "latte",
    categoryId: "coffee",
    name: "Cafe Latte",
    description: "Espresso with steamed milk",
    priceCents: 45000,
    available: true,
    prepMinutes: 5,
    optionGroups: [
      sizeGroup([
        { id: "small", label: "Small", priceDeltaCents: 0 },
        { id: "medium", label: "Medium", priceDeltaCents: 3000 },
        { id: "large", label: "Large", priceDeltaCents: 6000 },
      ]),
      {
        id: "milk",
        name: "Milk",
        required: false,
        choices: [
          { id: "regular", label: "Regular milk", priceDeltaCents: 0 },
          { id: "oat", label: "Oat milk", priceDeltaCents: 5000 },
        ],
      },
      {
        id: "extras",
        name: "Extras",
        required: false,
        choices: [
          { id: "extra-shot", label: "Extra shot", priceDeltaCents: 4000 },
        ],
      },
    ],
  },
  {
    id: "cappuccino",
    categoryId: "coffee",
    name: "Cappuccino",
    description: "Espresso with foamed milk",
    priceCents: 42000,
    available: true,
    prepMinutes: 5,
    optionGroups: [
      sizeGroup([
        { id: "small", label: "Small", priceDeltaCents: 0 },
        { id: "medium", label: "Medium", priceDeltaCents: 3000 },
        { id: "large", label: "Large", priceDeltaCents: 6000 },
      ]),
      {
        id: "style",
        name: "Style",
        required: false,
        choices: [
          { id: "regular", label: "Regular", priceDeltaCents: 0 },
          { id: "decaf", label: "Decaf", priceDeltaCents: 2000 },
        ],
      },
    ],
  },
  {
    id: "americano",
    categoryId: "coffee",
    name: "Americano",
    description: "Espresso with hot water",
    priceCents: 38000,
    available: true,
    prepMinutes: 4,
    optionGroups: [
      {
        id: "temperature",
        name: "Temperature",
        required: true,
        choices: [
          { id: "hot", label: "Hot", priceDeltaCents: 0 },
          { id: "iced", label: "Iced", priceDeltaCents: 3000 },
        ],
      },
      sizeGroup([
        { id: "small", label: "Small", priceDeltaCents: 0 },
        { id: "medium", label: "Medium", priceDeltaCents: 2000 },
        { id: "large", label: "Large", priceDeltaCents: 4000 },
      ]),
    ],
  },
  {
    id: "karak",
    categoryId: "tea",
    name: "Karak Chai",
    description: "Strong milk tea",
    priceCents: 25000,
    available: true,
    prepMinutes: 6,
    optionGroups: [
      sizeGroup([
        { id: "regular", label: "Regular", priceDeltaCents: 0 },
        { id: "large", label: "Large", priceDeltaCents: 5000 },
      ]),
      {
        id: "sweetness",
        name: "Sweetness",
        required: false,
        choices: [
          { id: "normal", label: "Normal", priceDeltaCents: 0 },
          { id: "less-sweet", label: "Less sweet", priceDeltaCents: 0 },
          { id: "extra-cardamom", label: "Extra cardamom", priceDeltaCents: 1000 },
        ],
      },
    ],
  },
  {
    id: "green-tea",
    categoryId: "tea",
    name: "Green Tea",
    description: "Light and refreshing",
    priceCents: 22000,
    available: true,
    prepMinutes: 4,
    optionGroups: [
      {
        id: "temperature",
        name: "Temperature",
        required: true,
        choices: [
          { id: "hot", label: "Hot", priceDeltaCents: 0 },
          { id: "iced", label: "Iced", priceDeltaCents: 2000 },
        ],
      },
    ],
  },
  {
    id: "omelette",
    categoryId: "breakfast",
    name: "Cheese Omelette",
    description: "Served with toast",
    priceCents: 55000,
    available: true,
    prepMinutes: 12,
    optionGroups: [
      {
        id: "bread",
        name: "Bread",
        required: true,
        choices: [
          { id: "white", label: "White bread", priceDeltaCents: 0 },
          { id: "brown", label: "Brown bread", priceDeltaCents: 2000 },
        ],
      },
    ],
  },
  {
    id: "paratha",
    categoryId: "breakfast",
    name: "Chicken Paratha Roll",
    description: "Stuffed paratha with chicken filling",
    priceCents: 48000,
    available: true,
    prepMinutes: 15,
    optionGroups: [
      {
        id: "spice",
        name: "Spice level",
        required: true,
        choices: [
          { id: "mild", label: "Mild", priceDeltaCents: 0 },
          { id: "spicy", label: "Spicy", priceDeltaCents: 0 },
        ],
      },
    ],
  },
  {
    id: "classic-burger",
    categoryId: "burgers",
    name: "Classic Beef Burger",
    description: "Beef patty, cheese, lettuce, sauce",
    priceCents: 75000,
    available: true,
    prepMinutes: 18,
    optionGroups: [
      sizeGroup([
        { id: "single", label: "Single patty", priceDeltaCents: 0 },
        { id: "double", label: "Double patty", priceDeltaCents: 15000 },
      ]),
      {
        id: "extras",
        name: "Extras",
        required: false,
        choices: [
          { id: "no-onions", label: "No onions", priceDeltaCents: 0 },
          { id: "extra-cheese", label: "Extra cheese", priceDeltaCents: 3000 },
        ],
      },
    ],
  },
  {
    id: "chicken-burger",
    categoryId: "burgers",
    name: "Crispy Chicken Burger",
    description: "Crispy chicken fillet with mayo",
    priceCents: 72000,
    available: true,
    prepMinutes: 18,
    optionGroups: [
      sizeGroup([
        { id: "single", label: "Single", priceDeltaCents: 0 },
        { id: "double", label: "Double", priceDeltaCents: 12000 },
      ]),
      {
        id: "sauce",
        name: "Sauce",
        required: false,
        choices: [
          { id: "regular-mayo", label: "Regular mayo", priceDeltaCents: 0 },
          { id: "spicy-mayo", label: "Spicy mayo", priceDeltaCents: 0 },
          { id: "extra-cheese", label: "Extra cheese", priceDeltaCents: 3000 },
        ],
      },
    ],
  },
  {
    id: "brownie",
    categoryId: "desserts",
    name: "Chocolate Brownie",
    description: "Warm brownie with chocolate sauce",
    priceCents: 35000,
    available: true,
    prepMinutes: 3,
    optionGroups: [
      {
        id: "extras",
        name: "Extras",
        required: false,
        choices: [
          { id: "ice-cream", label: "With ice cream", priceDeltaCents: 8000 },
        ],
      },
    ],
  },
  {
    id: "cheesecake",
    categoryId: "desserts",
    name: "New York Cheesecake",
    description: "Creamy baked cheesecake slice",
    priceCents: 42000,
    available: true,
    prepMinutes: 2,
    optionGroups: [
      {
        id: "topping",
        name: "Topping",
        required: false,
        choices: [
          { id: "berry", label: "Berry topping", priceDeltaCents: 5000 },
        ],
      },
    ],
  },
];
