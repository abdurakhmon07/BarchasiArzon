/** wrangler.jsonc "rules" import .css files as plain text (the admin stylesheet). */
declare module "*.css" {
  const text: string;
  export default text;
}
