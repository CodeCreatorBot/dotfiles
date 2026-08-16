-- lsp.lua
return {
  -- LSP servers
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        -- Python: use Pyright for type checking + Ruff LSP for diagnostics/code actions
        pyright = {},
        ruff = {},

        -- TypeScript / JavaScript
        tsserver = {
          -- keep it simple; we turn off tsserver formatting below to let Prettier handle it
          settings = {
            javascript = { format = { enable = false } },
            typescript = { format = { enable = false } },
          },
        },

        -- shell
        bashls = {
          filetypes = { "sh", "bash" },
          settings = {
            globPattern = "*@(.sh|.bash|.env|bashrc)",
          },
        },
      },

      setup = {
        -- Prefer external formatters (Prettier/Ruff) over LSP formatting
        tsserver = function(_, opts)
          local lsp = require("lspconfig")
          lsp.tsserver.setup(vim.tbl_deep_extend("force", opts, {
            on_attach = function(client, bufnr)
              client.server_capabilities.documentFormattingProvider = false
              client.server_capabilities.documentRangeFormattingProvider = false

              local group = vim.api.nvim_create_augroup("TsserverOrganizeImports", { clear = false })
              vim.api.nvim_create_autocmd("BufWritePre", {
                group = group,
                buffer = bufnr,
                desc = "Organize imports on save (tsserver)",
                callback = function()
                  vim.lsp.buf.code_action({
                    apply = true,
                    context = { only = { "source.organizeImports" }, diagnostics = {} },
                  })
                end,
              })
            end,
          }))
          return true
        end,
        pyright = function(_, opts)
          local lsp = require("lspconfig")
          lsp.pyright.setup(vim.tbl_deep_extend("force", opts, {
            on_attach = function(client, _)
              -- Let Ruff/Black handle formatting
              client.server_capabilities.documentFormattingProvider = false
              client.server_capabilities.documentRangeFormattingProvider = false
            end,
          }))
          return true
        end,
      },
    },
  },

  -- Mason: ensure the tools exist
  {
    "mason-org/mason.nvim",
    opts = {
      ensure_installed = {
        -- LSPs
        "pyright",
        "typescript-language-server",
        "bash-language-server",
        -- Linters / formatters
        "ruff",
        "black",
        "eslint_d",
        "prettierd",
        "shellcheck",
        "shfmt",
        "taplo", -- toml
      },
    },
  },

  -- Treesitter: basic parsers
  {
    "nvim-treesitter/nvim-treesitter",
    opts = {
      ensure_installed = {
        "python",
        "typescript",
        "tsx",
        "javascript",
        "json",
        "html",
        "css",
        "lua",
        "vim",
        "vimdoc",
        "bash",
        "toml",
      },
    },
  },

  -- Formatting: use Conform (included by LazyVim) – minimal filetype map
  {
    "stevearc/conform.nvim",
    -- ensure the plugin loads early enough so hooks are registered
    event = { "BufReadPre", "BufNewFile", "BufWritePre" },
    opts = {
      default_format_opts = {
        timeout_ms = 3000,
        async = false,
        lsp_format = "fallback",
      },
      formatters_by_ft = {
        python = { "ruff_format", "black" },
        typescript = { "prettierd" },
        javascript = { "prettierd" },
        typescriptreact = { "prettierd" },
        javascriptreact = { "prettierd" },
        json = { "prettierd" },
        css = { "prettierd" },
        html = { "prettierd" },
        yaml = { "prettierd" },
        markdown = { "prettierd" },
        sh = { "shfmt" },
        bash = { "shfmt" },
        toml = { "taplo" },
      },
      format_on_save = {
        timeout_ms = 500,
        lsp_format = "fallback",
      },
    },
  },

  -- Linting: use nvim-lint (included by LazyVim)
  {
    "mfussenegger/nvim-lint",
    opts = function(_, opts)
      opts.linters_by_ft = vim.tbl_deep_extend("force", opts.linters_by_ft or {}, {
        python = {},
        javascript = { "eslint_d" },
        typescript = { "eslint_d" },
        javascriptreact = { "eslint_d" },
        typescriptreact = { "eslint_d" },
        bash = { "shellcheck" },
        zsh = { "shellcheck" },
      })
    end,
  },

  -- Flutter
  {
    "nvim-flutter/flutter-tools.nvim",
    lazy = false,
    dependencies = {
      "nvim-lua/plenary.nvim",
      "stevearc/dressing.nvim", -- for vim.ui.select
    },
    config = function()
      require("flutter-tools").setup({
        -- keep it minimal to start; you can add more later
        lsp = {
          settings = {
            showTodos = true,
            completeFunctionCalls = true,
          },
        },
      })
    end,
  },
}
