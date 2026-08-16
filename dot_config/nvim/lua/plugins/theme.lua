return {
  -- Primary theme: nordic.nvim (Nord palette, warmer/darker with Aurora accents)
  {
    "AlexvZyl/nordic.nvim",
    lazy = false,
    priority = 1000,
    opts = {
      -- This callback can be used to override the colors used in the base palette.
      on_palette = function(palette) end,
      -- This callback can be used to override highlights before they are applied.
      on_highlight = function(highlights, palette) end,
      -- Enable italic comments (matches existing style)
      italic_comments = true,
      -- Enable editor background transparency (replaces transparency.lua for bg groups)
      transparent = {
        bg = true,
        float = true,
      },
      -- Reduce blue tint (diverges from base Nord -- warmer, which is the point of nordic)
      reduced_blue = true,
      -- Cursorline: dark blend
      cursorline = {
        bold = false,
        bold_number = true,
        theme = "dark",
        blend = 0.85,
      },
    },
    config = function(_, opts)
      require("nordic").setup(opts)
      require("nordic").load()
    end,
  },

  -- Tell LazyVim to use nordic as the default colorscheme.
  -- This also enables the hot-reload system in omarchy-theme-hotreload.lua
  -- which reads opts.colorscheme from the LazyVim/LazyVim spec.
  {
    "LazyVim/LazyVim",
    opts = {
      colorscheme = "nordic",
    },
  },
}
