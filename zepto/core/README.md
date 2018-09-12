## Zepto core核心模块源码解读

**Zepto 版本为 v1.2.0**

## 1. $的转换
首先我们得找到 `$` 这个方法。(`$`一般是 `$()` 这样引用的，由此可知 `$` 是一个函数)

```
$ = function (selector, context) {
    return zepto.init(selector, context)
}
```

`$` 返回的是 `zepto.init(selector, context)`  zepto对象的`init`方法， 接收两个参数；
    1. selector 这个参数一般是 css选择器。 例如 `$('.div')` 这种情况
    2. context  用于创建元素时，给元素添加属性， 例如: `$('div', {text:"hello world", id:"div1", css:{color:'red'}})   => => <div id="div1" style="color:red">Hello</div>`；
        或者是获取节点的时候， context便是代表父元素，例如： `$('.a', '.parent') => 查找.a元素且父元素为.parent`


`$` 其实返回的是 `zepto.init` 方法， 所以我们来看下 这个方法
    
```
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
```

由此可以看出来  `zepto.init` 方法 最后返回的是 `zepto.Z()` 这个函数
然后我们再来看看 `zepto.Z` 这个函数

```
zepto.Z = function (dom, selector) {
    return new Z(dom, selector)
}

```

`zepto.Z` 返回的是 一个构造函数 `Z` 

```
// 伪造一个类数组，返回 所有元素，长度跟选择器名字，
function Z(dom, selector) {
    var i, len = dom ? dom.length : 0
    for (i = 0; i < len; i++) this[i] = dom[i]
    this.length = len
    this.selector = selector || ''
}
```


以上基本就完成了 整个 `Zepto对象` 的转换
把 `$('.div')` 转换成了 `Zepto实例对象`
其中转换过程中对不同传参的的处理。以及最终都会被转换成 `Zepto实例对象`。
当通过 `$` 转换成 `Zepto对象` 之后，便可以获取`zepto原型`上定义的所有方法 
`zepto原型`上的方法 绝大部分都定义在 `$.fn` 这个对象上


## 2. $.fn的实现

```
$.fn = {
    // 重新恢复他的 `constructor`, 避免通过 `{}(=> new Object)` 导致`constructor`指向 `构造函数Object`
    constructor: zepto.Z,

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
    //...
    //...
    //...
}


// 给zepto.Z函数 和 构造函数Z 的 prototype 赋值 $.fn
// $ => zepto.init => zepto.Z => Z
zepto.Z.prototype = Z.prototype = $.fn


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

```


`core模块` 主要实现的便是这些东西。 具体里面更多细节的转换可以直接通过下载我这个部分源码进行查看， `core模块`的源码部分 都有注释
