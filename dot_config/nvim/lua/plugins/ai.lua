return {
  {
    "nickjvandyke/opencode.nvim",
    version = "*", -- Latest stable release
    dependencies = {
      {
        -- `snacks.nvim` integration is recommended, but optional
        ---@module "snacks" <- Loads `snacks.nvim` types for configuration intellisense
        "folke/snacks.nvim",
        optional = true,
        opts = {
          input = {}, -- Enhances `ask()`
          picker = { -- Enhances `select()`
            actions = {
              opencode_send = function(...)
                return require("opencode").snacks_picker_send(...)
              end,
            },
            win = {
              input = {
                keys = {
                  ["<a-a>"] = { "opencode_send", mode = { "n", "i" } },
                },
              },
            },
          },
        },
      },
    },
    config = function()
      ---@type opencode.Opts
      vim.g.opencode_opts = {
        -- Your configuration, if any; goto definition on the type or field for details
      }

      vim.o.autoread = true -- Required for `opts.events.reload`

      vim.keymap.set({ "n", "x" }, "<leader>o", "<Nop>", { desc = "+opencode" })
      vim.keymap.set({ "n", "x" }, "<leader>os", function()
        require("opencode").select()
      end, { desc = "Select List" })
      vim.keymap.set({ "n", "x" }, "<leader>oa", function()
        require("opencode").ask("@this: ", { submit = true })
      end, { desc = "Ask" })
      vim.keymap.set("n", "<leader>ob", function()
        require("opencode").prompt("@buffer ")
      end, { desc = "Add Buffer" })
      vim.keymap.set({ "n", "x" }, "<leader>oi", function()
        return require("opencode").operator("@this ")
      end, { desc = "Insert this", expr = true })
      vim.keymap.set("n", "<leader>ol", function()
        return require("opencode").operator("@this ") .. "_"
      end, { desc = "Insert line", expr = true })
      vim.keymap.set("n", "<leader>of", function()
        require("opencode").prompt("Fix @diagnostics in @buffer ", { submit = true })
      end, { desc = "Fix diagnostics" })
      vim.keymap.set("n", "<leader>oe", function()
        require("opencode").prompt("Explain @this ", { submit = true })
      end, { desc = "Explain This" })

      -- Archive
      -- vim.keymap.set("n", "<leader>ot", function()
      --   require("opencode").toggle()
      -- end, { desc = "Toggle opencode" })
      -- vim.keymap.set("n", "<S-C-u>", function()
      --   require("opencode").command("session.half.page.up")
      -- end, { desc = "Scroll opencode up" })
      -- vim.keymap.set("n", "<S-C-d>", function()
      --   require("opencode").command("session.half.page.down")
      -- end, { desc = "Scroll opencode down" })
      --
      -- You may want these if you use the opinionated `<C-a>` and `<C-x>` keymaps above - otherwise consider `<leader>o...` (and remove terminal mode from the `toggle` keymap)
      -- vim.keymap.set("n", "+", "<C-a>", { desc = "Increment under cursor", noremap = true })
      -- vim.keymap.set("n", "-", "<C-x>", { desc = "Decrement under cursor", noremap = true })
    end,
  },

  -- Minuet
  {
    "milanglacier/minuet-ai.nvim",
    config = function()
      require("minuet").setup({
        -- Your configuration options here
        --  provider = "codestral",
        provider_options = {
          codestral = {
            model = "codestral-latest",
            end_point = "https://codestral.mistral.ai/v1/fim/completions",
            api_key = "CODESTRAL_API_KEY", -- reads from environment variable
            stream = true,
            optional = {
              max_tokens = 256,
              stop = { "\n\n" },
            },
          },
        },
      })
    end,
  },
  {
    "saghen/blink.cmp",
    optional = true,
    opts = {
      keymap = {
        ["<M-y>"] = {
          function(cmp)
            cmp.show({ providers = { "minuet" } })
          end,
        },
      },
      sources = {
        -- if you want to use auto-complete
        default = { "minuet" },
        providers = {
          minuet = {
            name = "minuet",
            module = "minuet.blink",
            score_offset = 100,
          },
        },
      },
    },
  },
  {
    "nvim-lualine/lualine.nvim",
    event = "VeryLazy",
    opts = function(_, opts)
      opts.sections = opts.sections or {}
      opts.sections.lualine_x = {
        {
          require("minuet.lualine"),
          display_name = "both",
          provider_model_separator = ":",
          -- display_on_idle = false,
        },
        {
          require("opencode").statusline,
        },
        "encoding",
        "fileformat",
        "filetype",
      }
    end,
  },
}
