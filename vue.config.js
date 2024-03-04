const { defineConfig } = require('@vue/cli-service')

const AutoImport = require('unplugin-auto-import/webpack')
const Components = require('unplugin-vue-components/webpack')
/*
{键名：值}是将对象解构，只有键名匹配才能解构，否则失败
unplugin-vue-components支持多种组件库，需要其中的ElementPlus组件库，所以将其解构，然后配置。
若需要Ant Design Vue，则
const { AntDesignVueResolver } = require('unplugin-vue-components/resolvers')，然后配置。
重申以下，不配置自动导入失效，因为无法检索到所需组件在哪个组件库中
*/
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers')

module.exports = defineConfig({
  publicPath: './',
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      /**
      ElementPlus({
        libs: [{
          libraryName: 'element-plus',
                esModule: true,
                resolveStyle: (name) => {
                  return `element-plus/theme-chalk/${name}.css`
                }
        }]
      }),**/
      AutoImport({
        resolvers: [
          ElementPlusResolver(),
          // AntDesignVueResolver()
        ],
      }),
      Components({
        resolvers: [
          // 需要ElementPus组件库，所以配置ElementPlus组件库
          ElementPlusResolver(),
          // AntDesignVueResolver()
        ],
      })
    ]
  }
})