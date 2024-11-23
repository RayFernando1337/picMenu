import { z } from "zod";

export const menuItemSchema = z.object({
  name: z.string().describe("The name of the menu item"),
  price: z.string().describe("The price of the menu item"),
  description: z.string().describe("A detailed description of the menu item"),
  menuImage: z.object({
    b64_json: z.string().describe("Base64 encoded image of the menu item")
  })
});

export const menuSchema = z.array(menuItemSchema);

export type MenuItem = z.infer<typeof menuItemSchema>; 