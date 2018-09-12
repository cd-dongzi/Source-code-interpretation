/* Zepto v1.2.0 - zepto event ajax form ie - zeptojs.com/license */
(function (global, factory) {
    if (typeof define === 'function' && define.amd)
        define(function () { return factory(global) })
    else
        factory(global)
}(this, function (window) {
    var Zepto = (function () {
        var zepto = {}, $, key, document = window.document,
            uniq, // 去重方法
            camelize,
            elementDisplay = {},
            classCache = {},
            tempParent = document.createElement('div'),
            propMap = { // html属性转JS属性
                'tabindex': 'tabIndex',
                'readonly': 'readOnly',
                'for': 'htmlFor',
                'class': 'className',
                'maxlength': 'maxLength',
                'cellspacing': 'cellSpacing',
                'cellpadding': 'cellPadding',
                'rowspan': 'rowSpan',
                'colspan': 'colSpan',
                'usemap': 'useMap',
                'frameborder': 'frameBorder',
                'contenteditable': 'contentEditable'
            },
            cssNumber = { 'column-count': 1, 'columns': 1, 'font-weight': 1, 'line-height': 1, 'opacity': 1, 'z-index': 1, 'zoom': 1 }

        // 生成元素
        var table = document.createElement('table'),
            tableRow = document.createElement('tr'),
            containers = {
                'tr': document.createElement('tbody'),
                'tbody': table, 'thead': table, 'tfoot': table,
                'td': tableRow, 'th': tableRow,
                '*': document.createElement('div')
            }
        
        // 数组及方法
        var emptyArray = [], 
            concat = emptyArray.concat, 
            filter = emptyArray.filter, 
            slice = emptyArray.slice

        // zepto方法
        var methodAttributes = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'],
            adjacencyOperators = ['after', 'prepend', 'before', 'append'] //zepto的添加元素的方法 

        /**
         * fragmentRE
         * 匹配html标签 和 html 注释 (只要包含标签就能匹配到， <div>sad  这样也是可以的， 会匹配到<div>)
         * ^\s* 匹配任何不可见字符，包括空格、制表符、换页符 0到多个, 用来创建元素时，避免出现空格什么的导致匹配不上
         * <(\w+|!)[^>]*> 匹配标签，包括注释标签
         */
        var fragmentRE = /^\s*<(\w+|!)[^>]*>/
        /**
         * singleTagRE
         * 匹配 HTML 标签 （不会匹配到 <div>sad 这种， 只能匹配到正常的标签，也不能匹配 <div><p></p></div>， 只能匹配单个标签）
         * /^<(\w+)\s*\/?>  匹配单个标签 例如 <div> 或 <div/>
         * (?:<\/\1>|)  匹配 </\w+> 或者 空。 例如 </div> 或者 "" （ \1的意思跟$1的意思一样，只是\1是在正则表达式内部使用）
         */
        var singleTagRE = /^<(\w+)\s*\/?>(?:<\/\1>|)$/
        /**
         * tagExpanderRE
         * 用于补全标签 例如: <div/> => <div></div> | <div id="a"/> => <div id="a"></div>
         * (?!area|br|col|embed|hr|img|input|link|meta|param)  这些标签将不会匹配。
         * (([\w:]+)[^>]*) $1匹配最外面的括号， $2匹配里面的括号 例如: <div id="123"/>  $1=(div id="123") $2=(div) 
         */
        var tagExpanderRE = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig

        var simpleSelectorRE = /^[\w-]*$/
        var readyRE = /complete|loaded|interactive/
        var capitalRE = /([A-Z])/g
        var rootNodeRE = /^(?:body|html)$/i


        // 判断类型
        var class2type = {}, toString = class2type.toString
        function type(obj) {
            return obj == null ? String(obj) :
                class2type[toString.call(obj)] || "object"
        }
        
        var isArray = Array.isArray || function (object) { return object instanceof Array }
        function isFunction(value) { return type(value) == "function" }
        function isWindow(obj) { return obj != null && obj == obj.window }
        function isDocument(obj) { return obj != null && obj.nodeType == obj.DOCUMENT_NODE }
        function isObject(obj) { return type(obj) == "object" }
        function isPlainObject(obj) {
            return isObject(obj) && !isWindow(obj) && Object.getPrototypeOf(obj) == Object.prototype
        }
        function likeArray(obj) {
            /**
             * !!obj && 'length' in obj && obj.length
             * !!obj 转换成布尔值 
             * 'length' in obj  查询对象是否具有某个属性
             * 当obj为真， 而且 obj具有 'length' 属性, 便执行obj.length并返回obj.length, (|| 和 &&的短路原理就不多说了）
             */
            var length = !!obj && 'length' in obj && obj.length,
                type = $.type(obj) // 获取类型
        
            // 意思就是只要是数组或者具有length属性， 而且length-1的值是对象的属性就返回的true
            // [1,2,3] 或 {0: 'a', 1: 'b', length: 2} 都会返回true 
            // {0: 'a', 'a': 'b', 2: 'c', length: 3} 其实这样也会返回
            return 'function' != type && // 不是函数
                !isWindow(obj) && // 不是window 
                ( 'array' == type || // 类型是数组
                length === 0 || // 长度为0
                // length是一个数字，且length>0,且lengt-1的值 是 obj的属性
                (typeof length == 'number' && length > 0 && (length - 1) in obj)
            )
        }

        // 过滤值为null的元素
        function compact(array) { return filter.call(array, function (item) { return item != null }) }

        // 转换成数组
        function flatten(array) { return array.length > 0 ? $.fn.concat.apply([], array) : array }

        // 去除重复的值 例如： [1,1,2,2,2,3,3] => [1,2,3] 
        uniq = function (array) { return filter.call(array, function (item, idx) { return array.indexOf(item) == idx }) }

        // 将nodes封装成zepto对象
        // 如果selector传了值， 便通过selector来过滤封装好的zepto对象
        function filtered(nodes, selector) {
            return selector == null ? $(nodes) : $(nodes).filter(selector)
        }

        // 获取子元素
        function children(element) {
            return 'children' in element ? // 是否拥有 children 属性
                slice.call(element.children) : // 拥有children属性，直接通过slice方法转换成数组返回

                // 不支持children属性， 通过 $.map 方法转成数组
                // node 必须为元素节点
                $.map(element.childNodes, function (node) { 
                    if (node.nodeType == 1) return node
                })
        }

        // 如果 arg 是函数，则改变函数的执行环境和参数
        // 如果不是，直接返回 arg
        function funcArg(context, arg, idx, payload) {
            return isFunction(arg) ? arg.call(context, idx, payload) : arg
        }

        // 设置节点属性， 为空移除该属性
        function setAttribute(node, name, value) {
            value == null ? node.removeAttribute(name) : node.setAttribute(name, value)
        }

        // 返回节点默认的display属性，如果是none 则 置为 block
        function defaultDisplay(nodeName) {
            var element, display
            // 前面定义的elementDisplay 对象， 
            // 如果elementDisplay对象已经拥有该标签的默认display属性值，直接返回，不进入
            if (!elementDisplay[nodeName]) {
                // 生成标签并获取该标签节点的默认display属性
                element = document.createElement(nodeName)
                document.body.appendChild(element)
                display = getComputedStyle(element, '').getPropertyValue("display")
                element.parentNode.removeChild(element)
                // 为none 则置为 block
                display == "none" && (display = "block")

                // 最后把该标签的display属性赋值给 elementDisplay对象
                elementDisplay[nodeName] = display
            }
            return elementDisplay[nodeName]
        }


        // 转换成驼峰命名 例如： background-color => backgroundColor
        camelize = function (str) { return str.replace(/-+(.)?/g, function (match, chr) { return chr ? chr.toUpperCase() : '' }) }

        // 转成正常属性格式 backgroundColor => background-color
        function dasherize(str) {
            return str.replace(/::/g, '/')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                .replace(/_/g, '-')
                .toLowerCase()
        }

        // 添加px
        function maybeAddPx(name, value) {
            // 当属性名不是 cssNumber 里面的一种， 且值是number的话， 在后面添加 px
            return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
        }

        // 获取className 或者 设置 className
        // baseVal ? 不知道啥东西
        function className(node, value) {
            var klass = node.className || '',
                svg = klass && klass.baseVal !== undefined
            
            // value为 undefined 的时候， 返回 klass.baseVal( 没找到这是啥，) 或 class名
            if (value === undefined) return svg ? klass.baseVal : klass

            // 不为undefined。 直接赋值
            svg ? (klass.baseVal = value) : (node.className = value)
        }

        // class类名的正则
        // \s 匹配任何不可见字符, 包括空格、制表符、换页符等等。等价于[ \f\n\r\t\v]。
        // 为了防止出现空格， 换行符。。。而导致匹配不上
        function classRE(name) {
            return name in classCache ? 
                classCache[name] : (classCache[name] = new RegExp('(^|\\s)' + name + '(\\s|$)'))
        }

        
        // 反序列化值
        // "true"  => true
        // "false" => false
        // "null"  => null
        // "42"    => 42
        // "42.5"  => 42.5
        // "08"    => "08"
        // JSON    => parse if valid
        // String  => self
        function deserializeValue(value) {
            try {
                return value ? value == "true" ||
                    (value == "false" ? false :
                        value == "null" ? null :
                            +value + "" == value ? +value :
                                /^[\[\{]/.test(value) ? $.parseJSON(value) :
                                    value)
                    : value
            } catch (e) {
                return value
            }
        }

        // 接受一个html字符串和一个可选的标签名称
        // 返回 DOM 
        zepto.fragment = function (html, name, properties) {
            var dom, nodes, container

            // 只有一个标签的情况
            if (singleTagRE.test(html)) dom = $(document.createElement(RegExp.$1))

            
            if (!dom) {
                if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>") // 替换补全标签
                if (name === undefined) name = fragmentRE.test(html) && RegExp.$1 // 获取$1的值
                if (!(name in containers)) name = '*'

                container = containers[name] //包裹容器
                container.innerHTML = '' + html // 把补全好的标签放入容器中
                
                // $.each(elements, callback) $.each 其实是有返回值的， 返回的时elements
                // 这里的elements是slice.call(container.childNodes)
                // 也就是container.childNodes 其实就是刚刚补全好的标签，只不过现在转换成节点，并且通过slice 转换成数组了
                // dom = slice.call(container.childNodes)
                dom = $.each(slice.call(container.childNodes), function () {
                    container.removeChild(this)
                })
            }

            // 是否是一个纯粹的对象 例如：{}   但是 new Date()这些不是
            if (isPlainObject(properties)) {
                nodes = $(dom)
                $.each(properties, function (key, value) {
                    if (methodAttributes.indexOf(key) > -1) nodes[key](value) // 自定义方法赋值
                    else nodes.attr(key, value) // attr 赋值
                })
            }
            return dom
        }

        // 获取元素
        zepto.qsa = function (element, selector) {
            var found,
                // id选择器
                maybeID = selector[0] == '#', 
                // class选择器
                maybeClass = !maybeID && selector[0] == '.', 
                // 选择器名字，如果不是id和class其中一个，便取selector.slice(1), 如果是tag标签，直接取selector
                nameOnly = maybeID || maybeClass ? selector.slice(1) : selector,
                // 是否是简单选择器(有可能是复杂的选择器， 例如： div#child)
                isSimple = simpleSelectorRE.test(nameOnly)

            // 优先级: id > class > tag 
            return (element.getElementById && isSimple && maybeID) ?  // 是否通过ID来选择
                ((found = element.getElementById(nameOnly)) ? 
                    [found] : // 通过ID返回节点
                    [] // 没有返回[]
                ) : 
                (element.nodeType !== 1 && element.nodeType !== 9 && element.nodeType !== 11) ? // 容器节点是否是元素或document
                    [] : // 不是返回[]
                    slice.call(
                        isSimple && !maybeID && element.getElementsByClassName ? // 当没有ID的时候
                            maybeClass ? // 是否通过class来选择
                            element.getElementsByClassName(nameOnly) :  // 通过class选择
                            element.getElementsByTagName(selector) : // 通过ID选择
                            element.querySelectorAll(selector) // 其他情况，通过 querySelectorAll 来处理
                    )
        }

        // 判断 element 是否符合 selector 的选择要求
        zepto.matches = function (element, selector) {
            // 没传入元素节点 或者 非元素节点
            if (!selector || !element || element.nodeType !== 1) return false 
            
            // 如果元素被指定的选择器字符串选择，Element.matches()  方法返回true; 否则返回false
            // 就是判断当前的 elem 是否符合传入的 selector 的要求
            // https://developer.mozilla.org/zh-CN/docs/Web/API/Element/matches
            var matchesSelector = element.matches || element.webkitMatchesSelector ||
                element.mozMatchesSelector || element.oMatchesSelector ||
                element.matchesSelector
            if (matchesSelector) return matchesSelector.call(element, selector)

            // 浏览器不支持 matchesSelector 的情况
            var match, parent = element.parentNode, temp = !parent
            // 没有父节点，便创建div，再把当前元素append进去
            if (temp) (parent = tempParent).appendChild(element)
            
            // 通过 qsa 获取匹配的元素，并判断其中有没有 element
            // 不存在会返回0
            match = ~zepto.qsa(parent, selector).indexOf(element)
            
            // temp为true时， 前面执行过， 这次是删除子节点
            temp && tempParent.removeChild(element)
            return match
        }
        
        
        // Z的实例， 返回指定属性
        function Z(dom, selector) {
            var i, len = dom ? dom.length : 0
            for (i = 0; i < len; i++) this[i] = dom[i]
            this.length = len
            this.selector = selector || ''
        }
        zepto.isZ = function (object) {
            return object instanceof zepto.Z
        }
        zepto.Z = function (dom, selector) {
            return new Z(dom, selector)
        }
        // 初始化
        zepto.init = function (selector, context) {
            var dom

            //没有任何选择器的时候 例如 $()
            if (!selector) return zepto.Z() 

            // 传入字符串的时候
            else if (typeof selector == 'string') {
                //清楚空格
                selector = selector.trim() 
                
                // html标签字符串 例如: $('<div/>') => 转换成div的DOM节点
                if (selector[0] == '<' && fragmentRE.test(selector))
                    dom = zepto.fragment(selector, RegExp.$1, context), selector = null
                
                // 不是html标签字符串， 而且context有值的时候 例如： $('.a', '.parent') => 查找.a元素且父元素为.parent
                else if (context !== undefined) return $(context).find(selector) // 通过find方法选取

                //selector不是html字符串且context没有值的时候  例如: $('.a') => 寻找.a元素
                else dom = zepto.qsa(document, selector)
            }

            // 如果slector 传的函数， 便在ready函数中执行 例如： $(function(){ }) => JS 文件一般包裹在这个里面，用来代替 window.onload
            else if (isFunction(selector)) return $(document).ready(selector)

            // 如果传入的对象本身就是zepto对象， 直接返回 例如: $($('<div/>')) => 这里参数就是 $('<div/>')，所以直接返回就行
            else if (zepto.isZ(selector)) return selector

            // 当selector既不是假值（false, null, "", 0, NaN, undefined），字符串，函数，和 zepto对象的时候  
            else {
                // selector为数组, 过滤其中为null的元素
                if (isArray(selector)) dom = compact(selector)
                
                // selector为对象时, 直接返回对象
                else if (isObject(selector))
                    dom = [selector], selector = null

                // 这下面三个判断跟 selector == 'string'的基本一样，就没什么好说的了，
                // 并不强制第一个是 '<', (不过只要是字符串都走上面 string'的判断了，感觉这里好像没啥意义)
                else if (fragmentRE.test(selector))
                    dom = zepto.fragment(selector.trim(), RegExp.$1, context), selector = null
                else if (context !== undefined) return $(context).find(selector) // 通过find方法选取
                // And last but no least, if it's a CSS selector, use it to select nodes.
                else dom = zepto.qsa(document, selector)
            }

            // 最后通过调用zepto.Z方法返回了构造函数Z
            // dom 这里会是一个数组， 因为上面的判断最后返回的都是一个数组里面包裹的元素
            // selector 返回选择器的名字, 否则为null, 当 selector为假值时，会默认变成空字符串
            return zepto.Z(dom, selector)
        }

        $ = function (selector, context) {
            return zepto.init(selector, context)
        }
        
        
        // 判断类型
        $.type = type
        // 判断是否是一个函数
        $.isFunction = isFunction
        // 判断是否是windwo对象
        $.isWindow = isWindow
        // 判断是否是数组
        $.isArray = isArray
        // 判断是否是一个 纯粹的 对象 例如： {a:1}=>true  (new Date)=>false
        $.isPlainObject = isPlainObject

        // 拷贝
        function extend(target, source, deep) {
            // 上面定义了 key 变量，所以这里就不需要定义了。
            for (key in source)
                // 如果需要深拷贝， 而且拷贝是一个对象或者数组
                // 1. deep 为 true, 
                // 2. source[key] 是一个对象 或者 是一个数组
                if (deep && (isPlainObject(source[key]) || isArray(source[key]))) {

                    // source[key] 是一个对象 且 target[key] 不是一个对象
                    if (isPlainObject(source[key]) && !isPlainObject(target[key]))
                        // 不是一个对象, 需要转换成 对象
                        target[key] = {}
                    // source[key] 是一个数组 且 target[key] 不是一个数组
                    if (isArray(source[key]) && !isArray(target[key]))
                        // 不是一个数组, 需要转换成数组
                        target[key] = []
                    //target[key] 如果不转换， 执行递归 会出错
                    extend(target[key], source[key], deep)
                }
                 // 不满足以上条件，说明 source[key] 是一般的值类型，直接赋值给 target 就是了
                else if (source[key] !== undefined) target[key] = source[key]
        }

        // 赋值属性到targt对象
        $.extend = function (target) {
            var deep, // 是否深拷贝
                args = slice.call(arguments, 1) // 截取元素 => arguments.slice(1)
            
            // 第一个参数类型为 boolean
            if (typeof target == 'boolean') {
                deep = target // deep 赋值为 这个boolean值
                // 删除args的第一个元素，并把这个元素赋值给 target
                target = args.shift()
            }
            // 循环剩余的参数 执行 extend 方法
            args.forEach(function (arg) { extend(target, arg, deep) })
            return target
        }

        // 重新组织 elements 对象（数组、对象或者对象数组），对每一个元素，都执行callback 
        // 将callback返回的值push进一个新数组，并返回
        $.map = function (elements, callback) {
            var value, values = [], i, key
            
            // 是一个数组或对象数组时
            if (likeArray(elements))
                for (i = 0; i < elements.length; i++) {
                    value = callback(elements[i], i)
                    if (value != null) values.push(value)
                }
            else
                for (key in elements) {
                    value = callback(elements[key], key)
                    if (value != null) values.push(value)
                }
            return flatten(values)
        }
    
        // 重新组织 elements 对象（数组、对象或者对象数组），对每一个元素，都执行callback ,
        // 当callback 返回 false 时， 结束循环，并返回elements, 也就是zepto经常结束循环的用法: return false
        $.each = function (elements, callback) {
            var i, key
            if (likeArray(elements)) {
                for (i = 0; i < elements.length; i++)
                    if (callback.call(elements[i], i, elements[i]) === false) return elements
            } else {
                for (key in elements)
                    if (callback.call(elements[key], key, elements[key]) === false) return elements
            }

            return elements
        }
    
        // 给 class2type 对象赋值，用来判断类别
        $.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function (i, name) {
            class2type["[object " + name + "]"] = name.toLowerCase()
        })

        // 判断 parent 是否包含 node
        $.contains = document.documentElement.contains ?
            // 存在API： contains
            function (parent, node) {
                return parent !== node && parent.contains(node)
            } :
            // 不存在API： contains
            function (parent, node) {
                // node存在， node便赋值： node = node.parentNdoe , 
                // 这时候，只要 node === parent 就return true, 否则false
                while (node && (node = node.parentNode))
                    if (node === parent) return true
                return false
            }


        /**
         *  zepto 方法集合
         *  $.fn 就相当于一个特制的原型 __proto__
         *  $.fn 赋值给Z.prototype：
         *     zepto.Z.prototype = Z.prototype = $.fn
         *  当我们使用zepto时时这样使用的： 
         *      $('div').addClass('active')
         *  分解下 $('div').addClass('active')
         *  $('div')等于:  $('div') =  执行$() => return zepto.init() => return zepto.Z => return new Z, 所以最后return 出来的是Z的实例化
         *  而通过这个 zepto.Z.prototype = Z.prototype = $.fn  让Z的原型等于 $.fn
         *  所以：
         *  $('div').addClass('active') === Z.addClass('active') === $.fn.addClass('active')
         *  我们在$.fn定义的方法便能通过 $(...) 执行后进行调用了
         */       
        $.fn = {
            constructor: zepto.Z,
            length: 0,

            /*数组的一些原生方法*/
            forEach: emptyArray.forEach,
            reduce: emptyArray.reduce,
            push: emptyArray.push,
            sort: emptyArray.sort,
            splice: emptyArray.splice,
            indexOf: emptyArray.indexOf,

            /*自定义的方法*/
            
            // 通过检测document.readyState状态和 监听 DOMContentLoaded 方法，执行回调 
            ready: function (callback) {
                // need to check if document.body exists for IE as that browser reports
                // document ready when it hasn't yet created the body element
                if (readyRE.test(document.readyState) && document.body) callback($)
                else document.addEventListener('DOMContentLoaded', function () { callback($) }, false)
                return this
            },


            // 跟数组的concat基本一样
            concat: function () {
                var i, value, args = []
                for (i = 0; i < arguments.length; i++) {
                    value = arguments[i]
                    args[i] = zepto.isZ(value) ? value.toArray() : value
                }
                return concat.apply(zepto.isZ(this) ? this.toArray() : this, args)
            },

            // 通过 上面$.map 返回出来的是一个数组， 然后传入 $(), 返回出去
            map: function (fn) {
                return $($.map(this, function (el, i) { return fn.call(el, i, el) }))
            },

            // 跟数组的slice基本一样
            slice: function () {
                return $(slice.apply(this, arguments))
            },

            // 获取zepto数组中的元素, 未传参数，返回所有， 传入参数， 返回执行
            // 分为 正数 和 负数
            // 正数直接取下标
            // 负数则是从最后开始取，也就是 this.length-idx
            get: function (idx) {
                return idx === undefined ? slice.call(this) : this[idx >= 0 ? idx : idx + this.length]
            },

            // 获取所有元素
            toArray: function () { return this.get() },

            // 获取数组长度
            size: function () {
                return this.length
            },

            // 循环整个数组， 通过获取父节点，在通过父节点删除该子节点
            remove: function () {
                return this.each(function () {
                    if (this.parentNode != null)
                        this.parentNode.removeChild(this)
                })
            },

            // 调用数组的 every 方法， 该方法只要遇到有一个值为false， 就会结束循环，跟 $.each类似， 最后return 当前的this
            each: function (callback) {
                emptyArray.every.call(this, function (el, idx) {
                    return callback.call(el, idx, el) !== false
                })
                return this
            },

            // 返回满足指定 选择器 的元素。
            filter: function (selector) {
                // selector为函数， 返回值为 真 时便返回该元素， 为 假 时过滤该元素
                // 函数为true， 便会返回指定值。为false，会过滤
                // this.not(selector) 会过滤指定的元素
                // this.not(this.not(selector)) 给this.not(selector)再次过滤，便会返回当前函数指定的值了
                if (isFunction(selector)) return this.not(this.not(selector))
                return $(filter.call(this, function (element) {
                    return zepto.matches(element, selector)
                }))
            },

            // 与filter相反，
            // 过滤满足指定 选择器 的元素
            not: function (selector) {
                var nodes = []
                if (isFunction(selector) && selector.call !== undefined) // selector是函数, 便执行each方法
                    this.each(function (idx) { // 没有返回值或返回值为假的的时候， 便把当前对应的元素push到nodes中
                        if (!selector.call(this, idx)) nodes.push(this)
                    })
                else {
                    var excludes = typeof selector == 'string' ? this.filter(selector) : // 是字符串的话过滤出元素，并赋值给excludes
                        (likeArray(selector) && isFunction(selector.item)) ? // 当selector是数组， 而且selector.item是函数
                        slice.call(selector) : // 转换成数组并赋值
                        $(selector) // 否则直接返回$()转换过后的数组
                    this.forEach(function (el) { // 排除excludes 中包含的元素 并返回
                        if (excludes.indexOf(el) < 0) nodes.push(el)
                    })
                }
                // 把push进来的元素返回出去
                return $(nodes)
            },

            // 利用concat添加元素， 并利用uniq方法 去重
            add: function (selector, context) {
                return $(uniq(this.concat($(selector, context))))
            },

            // 判断第一个元素是否含有指定选择器
            is: function (selector) {
                return this.length > 0 && zepto.matches(this[0], selector)
            },

            // 返回符合指定选择器的元素， 或者是否包含指定的DOM节点
            has: function (selector) {
                return this.filter(function () {
                    return isObject(selector) ? // 是否是一个对象， 是的话证明传入的是一个DOM对象， 否则便是css选择器
                        $.contains(this, selector) : // 对象
                        $(this).find(selector).size() // 选择器
                })
            },

            // 获取指定下标的元素
            eq: function (idx) {
                return idx === -1 ? this.slice(idx) : this.slice(idx, + idx + 1)
            },

            // 获取第一个元素
            first: function () {
                var el = this[0]
                return el && !isObject(el) ? el : $(el)
            },

            // 获取最后一个元素
            last: function () {
                var el = this[this.length - 1]
                return el && !isObject(el) ? el : $(el)
            },

            // 寻找后代元素
            find: function (selector) {
                var result, $this = this
                if (!selector) result = $() 
                
                // selector为对象
                else if (typeof selector == 'object') 
                    result = $(selector).filter(function () {
                        var node = this
                        return emptyArray.some.call($this, function (parent) { // 数组 some方法， 只要有一个为true, 就直接返回true
                            return $.contains(parent, node) // parent（$this中的某一个， $this指向当前调用的zepto对象， 上面已声明）元素中是否存在selector其中的节点
                        })
                    })
                // 只有一个元素，通过qsa 获取元素并赋值给result 例如: $('.parent').find('.child')
                else if (this.length == 1) result = $(zepto.qsa(this[0], selector))
                
                // 例如： $('.parent, .parent1').find('.child')
                else result = this.map(function () { return zepto.qsa(this, selector) })
                return result
            },

            // 从元素本身开始，逐级向上级元素匹配，并返回最先匹配selector的元素
            closest: function (selector, context) {
                var nodes = [], 
                    collection = typeof selector == 'object' && $(selector) // 如果selector是对象， 通过$封装赋值给collection
                this.each(function (_, node) {

                    // 当node 存在， 
                    // collection（只有selector是对象才会有值）存在的话， 就判断collection中是否包含node节点.
                    // 否则判断node是否符合selector（当selecotr不是对象，证明传的是css选择器）条件
                    while (node && !(collection ? collection.indexOf(node) >= 0 : zepto.matches(node, selector)))

                        // 当node不等于context且node不是doucment。 就把node赋值成node.parentNode
                        node = node !== context && !isDocument(node) && node.parentNode
                    
                    // node存在且nodes中不包含node时。便把node push到nodes里面
                    if (node && nodes.indexOf(node) < 0) nodes.push(node)
                })
                // 返回$()封装好的nodes
                return $(nodes)
            },

            // 获取对象集合每个元素所有的祖先元素。如果css选择器参数给出，过滤出符合条件的元素。
            parents: function (selector) {
                var ancestors = [], nodes = this

                // node拥有元素
                while (nodes.length > 0)
                    // map循环取父级元素
                    // 通过map方法每次都reutrn出来了当前节点的父元素，重新赋值给nodes。 
                    // 会导致一直在while循环中， 直到所有节点都不在return父级元素为止
                    nodes = $.map(nodes, function (node) {
                        // 1. node赋值成node.parentNode且node.parentNode存在
                        // 2. 不是document
                        // 3. ancestors中不包含node
                        if ((node = node.parentNode) && !isDocument(node) && ancestors.indexOf(node) < 0) {
                            ancestors.push(node)

                            // return出来的node 其实是node.parentNode.因为前面已经赋值了
                            return node
                        }
                    })
                
                // 转换成zepto对象
                return filtered(ancestors, selector)
            },

            // 返回元素的指定属性值
            pluck: function (property) {
                return $.map(this, function (el) {
                    return el[property]
                })
            },

            // 获取父级元素。如果css选择器参数给出，过滤出符合条件的元素。
            parent: function (selector) {
                // 通过pluck获取 parentNode 并去重
                return filtered(uniq(this.pluck('parentNode')), selector)
            },


            // 获取子元素， 如果给定selector，那么返回的结果中只包含符合css选择器的元素。
            children: function (selector) {
                return filtered(this.map(function () { return children(this) }), selector)
            },

            // 获取所有子元素（包括文字和注释节点）
            contents: function () {
                return this.map(function () { return this.contentDocument || slice.call(this.childNodes) })
            },

            // 获取兄弟元素， 如果给定selector，那么返回的结果中只包含符合css选择器的元素。
            siblings: function (selector) {
                return filtered(this.map(function (i, el) {
                    // 通过 children 方法 传入当前el的父节点，来获取 子节点!==当前节点的所有子节点
                    return filter.call(children(el.parentNode), function (child) { return child !== el })
                }), selector)
            },

            // 清空对象集合中每个元素的DOM内容。
            empty: function () {
                return this.each(function () { this.innerHTML = '' })
            },

            // 如果当前元素的display为 none, 就把display属性置为 ''. 
            show: function () {
                return this.each(function () {
                    this.style.display == "none" && (this.style.display = '')

                    // 通过getComputedStyle 获取css属性，来判断 display的值，若值
                    if (getComputedStyle(this, '').getPropertyValue("display") == "none")
                        //  通过 defaultDisplay 方法来获取当前节点默认的display属性， 并赋值.
                        this.style.display = defaultDisplay(this.nodeName)
                })
            },

            // 用给定的内容替换所有匹配的元素。(包含元素本身)
            // 用before方法添加，在remove方法删除自身元素
            replaceWith: function (newContent) {
                return this.before(newContent).remove()
            },

            
            // 在所有匹配元素外面包一个单独的结构。结构可以是单个元素或 几个嵌套的元素
            wrapAll: function (structure) {
                if (this[0]) {
                    // 通过before添加元素
                    // structure = $(structure) ? 转换成zepto对象,在复制给structure, 然后通过before插入元素
                    $(this[0]).before(structure = $(structure))
                    var children
                    
                    // 获取 structure 最深处的子元素， 并重新赋值给 structure
                    while ((children = structure.children()).length) structure = children.first()

                    // 最后，把当前调用改方法的zepto对象append到 structure 中
                    $(structure).append(this)
                }
                return this
            },

            // 每个匹配的元素外层包上一个html元素
            wrap: function (structure) {
                var func = isFunction(structure)
                // 不是函数的时候
                if (this[0] && !func)
                    // 通过 $()转换成zepto对象，在通过 get(0) 获取元素
                    var dom = $(structure).get(0),

                        // 需要克隆的情况
                        // 1. 有parentNode 证明文档里面有这个节点，不可隆的话会导致节点发生变化
                        // 长度大于1 证明有多个元素， 每个都需要添加， 所以需要克隆
                        clone = dom.parentNode || this.length > 1

                return this.each(function (index) {
                    // 通过wrapAll方法append节点
                    $(this).wrapAll(
                        func ? structure.call(this, index) :
                            clone ? dom.cloneNode(true) : dom
                    )
                })
            },

            // 将每个元素中的内容包裹在一个单独的结构中
            wrapInner: function (structure) {
                // 是否是函数
                var func = isFunction(structure)

                return this.each(function (index) {
                    var self = $(this), 
                        contents = self.contents(), // 获取所有自子元素
                        dom = func ? 
                            structure.call(this, index) :  // 是函数， 绑定this, 传入下标
                            structure // 非函数， 直接赋值 structure
                    
                    // 存在子元素， 把每个元素通过wrapAll 都放入 dom 中。 
                    // 如果没有子元素, 就直接把 dom 添加到当前元素中
                    contents.length ? contents.wrapAll(dom) : self.append(dom)
                })
            },

            // 移除集合中每个元素的直接父节点，并把他们的子元素保留在原来的位置
            // 也基本就相当于 移除父元素
            unwrap: function () {
                // 循环当前元素的父元素
                this.parent().each(function () {

                    // replaceWith 替换指定内容。包括自己， 上面有此方法
                    // 把父元素的内容（包括父元素）替换子元素
                    $(this).replaceWith($(this).children())
                })
                return this
            },

            // 通过深度克隆来复制集合中的所有元素。
            clone: function () {
                // 通过map循环返回当前元素的克隆节点
                // cloneNode: 克隆当前节点， true: 克隆所有子元素
                return this.map(function () { return this.cloneNode(true) })
            },

            // display => none
            hide: function () {
                return this.css("display", "none")
            },

            // display 切换
            // none => 切换成本身的display默认值(如果为none 便切换成block)
            // 非none => 切换成 none
            toggle: function (setting) {
                return this.each(function () {
                    var el = $(this)
                        ; (setting === undefined ? el.css("display") == "none" : setting) ? el.show() : el.hide()
                })
            },

            // 获取对象集合中每一个元素的前一个兄弟节点，通过选择器来进行过滤
            // 通过 previousElementSibling 获取上一个兄弟元素节点， 再通过filter过滤
            prev: function (selector) { return $(this.pluck('previousElementSibling')).filter(selector || '*') },

            // 获取对象集合中每一个元素的下一个兄弟节点, 通过选择器来进行过滤
            // 通过 nextElementSibling 获取下一个兄弟元素节点， 再通过filter过滤
            next: function (selector) { return $(this.pluck('nextElementSibling')).filter(selector || '*') },

            // 获取元素html内容
            html: function (html) {
                return 0 in arguments ? // 有参数
                    this.each(function (idx) {
                        var originHtml = this.innerHTML
                        // 清空内容，在append内容
                        $(this).empty().append(funcArg(this, html, idx, originHtml))
                    }) :
                    // 没参数，直接返回的 innerHTML
                    (0 in this ? this[0].innerHTML : null) 
            },

            // 获取元素文本内容
            text: function (text) {
                return 0 in arguments ? // 有参数
                    this.each(function (idx) {
                        // 是函数，就返回函数的返回值，否则直接返回text内容
                        var newText = funcArg(this, text, idx, this.textContent)
                        // 为null处理
                        this.textContent = newText == null ? '' : '' + newText
                    }) :
                    // 没参数， 返回 textContent内容
                    (0 in this ? this.pluck('textContent').join("") : null)
            },

            // 读取或设置dom的属性
            attr: function (name, value) {
                var result
                return (typeof name == 'string' && !(1 in arguments)) ? 
                    // 第一个参数是字符串， 且没有第二个参数的时候, 也就是获取元素值
                    (0 in this && this[0].nodeType == 1 && (result = this[0].getAttribute(name)) != null ? 
                        // 1. 存在设置的元素
                        // 2. 设置的元素是元素节点 
                        // 3. 设置的元素拥有 name属性, 并返回 getAttribute 获取的值.
                        result : 
                        undefined) :

                    // 设置元素值。
                    this.each(function (idx) {
                        // 不是元素节点，直接 return
                        if (this.nodeType !== 1) return
                        // name参数是对象的话， for-in 循环设置
                        if (isObject(name)) for (key in name) setAttribute(this, key, name[key])
                        // 默认情况，直接设置
                        else setAttribute(this, name, funcArg(this, value, idx, this.getAttribute(name)))
                    })
            },

            // 移除当前对象集合中所有元素的指定属性
            removeAttr: function (name) {
                return this.each(function () {
                    // 当前节点是元素
                    // 以空格分割多个属性
                    this.nodeType === 1 && name.split(' ').forEach(function (attribute) {
                        setAttribute(this, attribute)
                    }, this)
                })
            },

            // 读取或设置dom元素的属性值。它在读取属性值的情况下优先于 attr，因为这些属性值会因为用户的交互发生改变，如checked 和 selected。
            prop: function (name, value) {
                name = propMap[name] || name
                return (1 in arguments) ? // 存在value， 设置属性
                    this.each(function (idx) {
                        this[name] = funcArg(this, value, idx, this[name])
                    }) :
                    // 不存在value， 直接返回属性
                    (this[0] && this[0][name])
            },

            // 从集合的每个DOM节点中删除一个属性。这是用JavaScript的delete操作符完成
            removeProp: function (name) {
                name = propMap[name] || name
                return this.each(function () { delete this[name] })
            },

            // 读取或写入dom的 data-* 属性
            data: function (name, value) {
                // 所有大写字母 转换成小写字母，并添加 -.
                // $('div').data('aB', '123') => <div data-a-b="123"></div>
                var attrName = 'data-' + name.replace(capitalRE, '-$1').toLowerCase()
                var data = (1 in arguments) ?
                    this.attr(attrName, value) : // 存在value， 赋值，
                    this.attr(attrName) // 不存在， 取值

                // 反序列化
                return data !== null ? deserializeValue(data) : undefined
            },

            // 获取或设置匹配元素的值
            val: function (value) {
                if (0 in arguments) { // 存在value值
                    if (value == null) value = ""
                    return this.each(function (idx) { // 循环赋值
                        this.value = funcArg(this, value, idx, this.value)
                    })
                } else {
                    return this[0] && (this[0].multiple ? // 存在 mutiple. => select标签
                        // 获取select下的selected状态的option标签， 并取该标签的值
                        $(this[0]).find('option').filter(function () { return this.selected }).pluck('value') :
                        this[0].value)
                }
            },

            // 读取或设置DOM元素的css属性
            css: function (property, value) {
                if (arguments.length < 2) { // 参数小于2个
                    var element = this[0] // 需要修改属性的节点

                    if (typeof property == 'string') { // property为字符串时
                        if (!element) return
                        // 通过 style获取， 或者通过getComputedStyle方法获取，并返回
                        return element.style[camelize(property)] || getComputedStyle(element, '').getPropertyValue(property)

                    } else if (isArray(property)) { // property为数组时
                        if (!element) return
                        var props = {}
                        var computedStyle = getComputedStyle(element, '')
                        // 循环赋值
                        $.each(property, function (_, prop) {
                            props[prop] = (element.style[camelize(prop)] || computedStyle.getPropertyValue(prop))
                        })

                        // 返回对象
                        return props
                    }
                }

                var css = ''
                if (type(property) == 'string') { // 字符串
                    if (!value && value !== 0) // value不存在且不为0， 移除该属性
                        this.each(function () { this.style.removeProperty(dasherize(property)) })
                    else
                        // css = font-size: 12px
                        css = dasherize(property) + ":" + maybeAddPx(property, value)
                } else {
                    for (key in property) // 对象
                        if (!property[key] && property[key] !== 0) // property[key]不存在且不为0， 移除该属性
                            this.each(function () { this.style.removeProperty(dasherize(key)) })
                        else
                            // css = font-size: 12px
                            css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
                }

                // cssText 的本质就是设置 HTML 元素的 style 属性值
                // IE hack: 添加 ';'
                return this.each(function () { this.style.cssText += ';' + css })
            },
            
            // 找到第一个定位过的祖先元素
            // offsetParent： offsetParent就是距离该子元素最近的进行过定位的父元素
            offsetParent: function () {
                return this.map(function () {
                    // 没有则是body元素
                    var parent = this.offsetParent || document.body 
                    // 父元素存在, 且不是body 和 html 元素， 而且 position 属性值是 'static'， 再次循环取值， 直到不满足条件为止
                    while (parent && !rootNodeRE.test(parent.nodeName) && $(parent).css("position") == "static")
                        parent = parent.offsetParent
                    return parent
                })
            },

            // 获得当前元素相对于document的位置
            offset: function (coordinates) {
                if (coordinates) return this.each(function (index) {
                    var $this = $(this),

                        //获取当前元素距离文档的距离
                        // coords => {left: '10px', top: '20px'} || {left: 10, top: 20}
                        coords = funcArg(this, coordinates, index, $this.offset()),
                        // 第一个定位的祖先父元素的位置
                        parentOffset = $this.offsetParent().offset(), 
                        
                        props = {
                            top: coords.top - parentOffset.top,
                            left: coords.left - parentOffset.left
                        }
                    
                    // 定位属性值为static 的时候 便置为 relative
                    if ($this.css('position') == 'static') props['position'] = 'relative'

                    // 通过 css 方法设置
                    $this.css(props)
                })
                if (!this.length) return null

                // 当前设置的元素为 documentElement 或者 documentElement不存在当前元素时，直接reutrn
                if (document.documentElement !== this[0] && !$.contains(document.documentElement, this[0]))
                    return { top: 0, left: 0 }
                
                // 通过 getBoundingClientRect 获取属性
                var obj = this[0].getBoundingClientRect()

                // pageXOffset 和 pageYOffset 属性返回文档在窗口左上角水平和垂直方向滚动的像素
                return {
                    left: obj.left + window.pageXOffset,
                    top: obj.top + window.pageYOffset,
                    width: Math.round(obj.width),
                    height: Math.round(obj.height)
                }
            },

            // 获取一个元素的索引值
            // 设置了elemen参数， 返回它在当前对象集合中的位置
            // elemen参数没有给出时, 返回当前元素在兄弟节点中的位置
            // 如果没有找到该元素，则返回-1。
            index: function (element) {
                return element ? this.indexOf($(element)[0]) : this.parent().children().indexOf(this[0])
            },

            // 检查对象集合中是否有元素含有指定的class
            hasClass: function (name) {
                if (!name) return false
                // some方法 只要有一个返回值为true， 那他就返回true
                // some 方法接受两个参数： (function, thisVal)
                // thisVal 代表this指向
                // classRE(name) 返回的是一个正则对象
                // 所以在 function里面的this 指向的就是这个正则对象
                return emptyArray.some.call(this, function (el) {
                    return this.test(className(el)) // 检测是否含有class
                }, classRE(name))
            },

            // 添加class
            addClass: function (name) {
                if (!name) return this
                return this.each(function (idx) {
                    // 是否含有属性 className
                    if (!('className' in this)) return
                    classList = []
                    var cls = className(this), // 获取当前元素的class属性
                        newName = funcArg(this, name, idx, cls) // 需要新增的class
                    
                    // 已空格分割来添加class
                    newName.split(/\s+/g).forEach(function (klass) {
                        // 不存在class就添加
                        if (!$(this).hasClass(klass)) classList.push(klass)
                    }, this)
                    // 通过className方法添加class
                    classList.length && className(this, cls + (cls ? " " : "") + classList.join(" "))
                })
            },

            // 移除class
            removeClass: function (name) {
                return this.each(function (idx) {
                    if (!('className' in this)) return
                    if (name === undefined) return className(this, '')
                    // 获取class属性值
                    classList = className(this)

                    // 空格分割开的属性转换成数组
                    funcArg(this, name, idx, classList).split(/\s+/g).forEach(function (klass) {
                        // 通过正则替换成空格
                        classList = classList.replace(classRE(klass), " ")
                    })
                    // 设置属性， 因为都被替换成空格了
                    className(this, classList.trim())
                })
            },

            // 在匹配的元素集合中的每个元素上添加或删除一个或多个样式类。如果class的名称存在则删除它，如果不存在，就添加它
            toggleClass: function (name, when) {
                if (!name) return this
                return this.each(function (idx) {
                    var $this = $(this), 
                        // 需要修改的class值
                        names = funcArg(this, name, idx, className(this))

                    names.split(/\s+/g).forEach(function (klass) {
                        // 通过判断 when 和 hasClass 来决定 rmeove 还是 add
                        (when === undefined ? !$this.hasClass(klass) : when) ? 
                            $this.addClass(klass) : $this.removeClass(klass)
                    })
                })
            },

            // 取或设置页面上的滚动元素或者整个窗口向下滚动的像素值。
            scrollTop: function (value) {
                if (!this.length) return
                var hasScrollTop = 'scrollTop' in this[0]
                // 没传value值的时候。
                // 不存在 scrollTop 则返回 pageYOffset值，
                // 存在就返回 scrollTop
                if (value === undefined) return hasScrollTop ? this[0].scrollTop : this[0].pageYOffset

                // 存在 value
                return this.each(hasScrollTop ? 
                    //直接设置 
                    function () { this.scrollTop = value } : 
                    // scrollTo  原生方法，把内容滚动到指定的坐标。
                    function () { this.scrollTo(this.scrollX, value) })
            },

            // 获取或设置页面上的滚动元素或者整个窗口向右滚动的像素值。
            // 跟scrollTop基本一样
            scrollLeft: function (value) {
                if (!this.length) return
                var hasScrollLeft = 'scrollLeft' in this[0]
                if (value === undefined) return hasScrollLeft ? this[0].scrollLeft : this[0].pageXOffset
                return this.each(hasScrollLeft ?
                    function () { this.scrollLeft = value } :
                    function () { this.scrollTo(value, this.scrollY) })
            },

            // 获取对象集合中第一个元素的位置。相对于 offsetParent
            position: function () {
                if (!this.length) return

                var elem = this[0],
                    // 找到第一个定位过的祖先元素 “relative”, “absolute” or “fixed”
                    offsetParent = this.offsetParent(),
                    // 获取自身的offset
                    offset = this.offset(),
                    // 当祖先元素是 body, html 的时候， 直接取 { top: 0, left: 0 }
                    // 否则取祖先元素的 offset
                    parentOffset = rootNodeRE.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset()

                // 去掉当前元素的 margin 宽度
                offset.top -= parseFloat($(elem).css('margin-top')) || 0
                offset.left -= parseFloat($(elem).css('margin-left')) || 0

                // 增加父元素的 border 宽度
                parentOffset.top += parseFloat($(offsetParent[0]).css('border-top-width')) || 0
                parentOffset.left += parseFloat($(offsetParent[0]).css('border-left-width')) || 0

                // 返回自身位置与父元素相减的距离
                return {
                    top: offset.top - parentOffset.top,
                    left: offset.left - parentOffset.left
                }
            }
        }

        // 针对当前元素、当前元素的子元素，都执行 fun 函数
        function traverseNode(node, fun) {
            fun(node)
            for (var i = 0, len = node.childNodes.length; i < len; i++)
                traverseNode(node.childNodes[i], fun)
        }

        // Generate the `after`, `prepend`, `before`, `append`,
        // `insertAfter`, `insertBefore`, `appendTo`, and `prependTo` methods.
        // 插入方法
        // ['after', 'prepend', 'before', 'append']
        adjacencyOperators.forEach(function (operator, operatorIndex) {
            // operatorIndex % 2 选中的是 => prepend, append
            var inside = operatorIndex % 2 //=> prepend, append

            // 给$.fn定义方法，因为这些类似的原因，可能因此就拿出来统一循环添加了
            $.fn[operator] = function () {
                //arguments: 参数可以是节点，节点数组，Zepto对象和HTML字符串
                var argType, 
                    nodes = $.map(arguments, function (arg) { // 重新格式化的节点
                        var arr = []
                        argType = type(arg) // 检查每个参数的类型
                        if (argType == "array") { // 参数是数组
                            arg.forEach(function (el) {
                                // el具有nodeType属性，便push进arr里面，return掉,阻止运行
                                if (el.nodeType !== undefined) return arr.push(el) 

                                // 判断是不是zepto对象，
                                // 是的话，获取el里面的所有元素，合并到arr里面, return掉,阻止运行
                                else if ($.zepto.isZ(el)) return arr = arr.concat(el.get()) 

                                // 上面条件都不是， 就通过 zepto.fragment 方法 返回DOM节点，在合并arr
                                arr = arr.concat(zepto.fragment(el))
                            })

                            // 将通过forEach重新赋值的arr返回出去
                            return arr
                        }
                        // 如果参数是对象或null 的时候，直接返回参数，
                        // 否则通过zepto.fragment(arg)获取DOM在返回出去
                        return argType == "object" || arg == null ?
                            arg : zepto.fragment(arg)
                    }),
                    parent, 
                    copyByClone = this.length > 1 // 当前this( 也就是需要操作的zepto对象 例如：$('.parnt, .parent2') )的长度大于1， 就需要克隆给每一个都赋值
                
                // 没有需要添加的内容
                if (nodes.length < 1) return this 
                
                // 循环this, 给每一个赋值
                return this.each(function (_, target) {
                    // inside == 1 是 ： prepend, append => 给子集赋值
                    // inside == 0 是 ： after before => 给同级赋值
                    parent = inside ? target : 
                        target.parentNode // 因为需要给同级赋值， 所以取父级元素来插入元素

                    // convert all methods to a "before" operation
                    target = operatorIndex == 0 ? target.nextSibling : // nextSibling 属性可返回某个元素之后紧跟的节点
                        operatorIndex == 1 ? target.firstChild : // firstChild 返回元素的第一个子节点
                        operatorIndex == 2 ? target :
                        null

                    // 判断HTML文档元素是否含有 parent元素
                    var parentInDocument = $.contains(document.documentElement, parent)

                    nodes.forEach(function (node) {
                        // 上面定义的copyByClone， 如果this的长度大于1，就需要克隆某个元素
                        if (copyByClone) node = node.cloneNode(true)  // 参数为true,  克隆所有子孙节点

                        // 插入元素的父节点不存在， 则删除该节点
                        else if (!parent) return $(node).remove()
                        

                        // 现有的子元素之前插入一个新的子元素
                        // 在target元素前插入元素
                        // target为null将会在最后插入元素
                        parent.insertBefore(node, target)

                        // 文档中存在 插入元素的 父元素
                        // traverseNode 遍历所有节点
                        if (parentInDocument) traverseNode(node, function (el) {
                            // 1.节点的nodeName不为空
                            // 2.节点的nodeName是 script
                            // 3.节点不存在type属性或者type属性为 text/javascript
                            // 4.节点没有src属性
                            if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
                                (!el.type || el.type === 'text/javascript') && !el.src) {
                                
                                // el.ownerDocument => 元素的根元素（文档对象）
                                // defaultView: 在浏览器中，该属性返回当前 document 对象所关联的 window 对象，如果没有，会返回 null
                                var target = el.ownerDocument ? el.ownerDocument.defaultView : window

                                // 通过eval的方法来执行 script 脚本中的内容
                                target['eval'].call(target, el.innerHTML)
                            }
                        })
                    })
                })
            }

            
            // 通过上面4个插入方法扩展出来的方法
            // after    => insertAfter
            // prepend  => prependTo
            // before   => insertBefore
            // append   => appendTo
            $.fn[inside ? operator + 'To' : 'insert' + (operatorIndex ? 'Before' : 'After')] = function (html) {
                // 因为 是这样使用的： $('<li>new list item</li>').appendTo('ul')
                // 所以this指向的是$('<li>new list item</li>'), 跟上面是相反的
                $(html)[operator](this)
                return this
            }

            // 反序列化
            if (window.JSON) $.parseJSON = JSON.parse
        })

        
        // 给zepto.Z函数 和 构造函数Z 的 prototype 赋值 $.fn
        // $ => zepto.init => zepto.Z => Z
        zepto.Z.prototype = Z.prototype = $.fn

        return $
        
    })()

    window.Zepto = Zepto
    window.$ === undefined && (window.$ = Zepto)

    return Zepto
}))
