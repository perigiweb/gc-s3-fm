import {
  defineConfig,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  presetIcons
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetWebFonts({
      provider: 'bunny',
      fonts: {
        sans: 'Inter:300,400,600,800',
		    jost: 'Jost:400,600,800'
      }
    }),
    presetIcons()
  ],
  transformers: [
    transformerDirectives()
  ],
  preflights: [
    {
      getCSS: ({theme}) => `*{box-sizing: border-box;}
      a,
      a:visited,
      a:active {
        color: ${theme.colors.emerald?.[700]};
      }
      a:hover {
        color: ${theme.colors.emerald?.[800]};
        text-decoration: underline;
      }
      .dark a,
      .dark a:visited,
      .dark a:active {
        color: ${theme.colors.emerald?.[400]};
      }
      .dark a:hover {
        color: ${theme.colors.emerald?.[300]};
      }
      p:not(:last-child){
        margin-bottom: 1rem;
      }`
    }
  ]
})
