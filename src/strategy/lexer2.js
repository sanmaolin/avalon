


var startTag = /^<([-A-Za-z0-9_\:]+)((?:\s+[\w-\:\@\$]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/,
        endTag = /^<\/([-A-Za-z0-9_\:]+)[^>]*>/,
        rattrs = /([^=\s]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;

// 半闭合元素
var empty = avalon.oneObject("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

// 块状元素
var block = avalon.oneObject("address,applet,blockquote,button,center,dd,del,dir,div,dl,dt,fieldset,form,frameset,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,p,pre,script,table,tbody,td,tfoot,th,thead,tr,ul");

// 内联元素
var inline = avalon.oneObject("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

// 自闭合元素
var closeSelf = avalon.oneObject("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

// 布尔属性
var fillAttrs = avalon.oneObject("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

// 容器元素,里面只能包含文本节点
var special = avalon.oneObject("script,style,textarea,xmp,noscript,template");
var regexpOne = {}
var rbinding = /^(?:ms\-|\:)(\w+)-?(.*)/
var HTMLParser = function (html, handler) {
    var index, chars, match, stack = [],
            last = html
    stack.last = function () {
        return this[this.length - 1]
    }

    while (html) {
        chars = true

        // 不处理容器元素
        if (!stack.last() || !special[stack.last()]) {

            // 注释节点
            if (html.indexOf("<!--") === 0) {
                index = html.indexOf("-->")

                if (index >= 0) {
                    if (handler.comment) {//处理注释节点的内容
                        handler.comment(html.substring(4, index))
                    }
                    html = html.substring(index + 3)
                    chars = false
                }

                // end tag
            } else if (html.indexOf("</") === 0) {
                match = html.match(endTag)

                if (match) {
                    html = html.substring(match[0].length)
                    match[0].replace(endTag, parseEndTag)
                    chars = false
                }

                // start tag
            } else if (html.indexOf("<") === 0) {
                match = html.match(startTag)

                if (match) {
                    html = html.substring(match[0].length)
                    //处理标签的属性
                    match[0].replace(startTag, parseStartTag)
                    chars = false
                }
            }

            if (chars) {
                index = html.indexOf("<");

                var text = index < 0 ? html : html.substring(0, index);
                html = index < 0 ? "" : html.substring(index);

                if (handler.chars) {//处理文本节点
                    handler.chars(text)
                }
            }

        } else {
            //抽取元素的innerHTML
            var tag = stack.last()
            var reg = regOne[tag]
            if (!reg) {
                reg = (regOne[tag] = new RegExp("(.*)<\/" + tag + "[^>]*>"))
            }

            html = html.replace(reg,
                    function (all, text) {
                        text = text.replace(/<!--(.*?)-->/g, "$1").
                                replace(/<!\[CDATA\[(.*?)]]>/g, "$1")

                        if (handler.chars)
                            handler.chars(text)

                        return ""
                    });

            parseEndTag("", stack.last())
        }

        if (html === last)
            throw "Parse Error: " + html;
        last = html;
    }

    // Clean up any remaining tags
    parseEndTag();

    function parseStartTag(tag, tagName, rest, unary) {
        tagName = tagName.toLowerCase();

        if (block[tagName]) {
            while (stack.last() && inline[stack.last()]) {
                parseEndTag('', stack.last());
            }
        }

        if (closeSelf[tagName] && stack.last() === tagName) {
            parseEndTag('', tagName);
        }

        unary = empty[tagName] || !!unary;

        if (!unary) {
            stack.push(tagName);
        }
        if (handler.start) {
            var attrs = {};

            rest.replace(rattrs, function (match, name) {
                name = name.toLowerCase()
                var value = arguments[2] ? arguments[2] :
                        arguments[3] ? arguments[3] :
                        arguments[4] ? arguments[4] :
                        fillAttrs[name] ? name : '';
                if (!attrs[name]) {
                    attrs[name] = value
                }
            })

            switch (tagName) {
                case 'textarea':
                    attrs.type = 'textarea'
                    break
                case 'input':
                    if (!attrs.type) {
                        attrs.type = 'text'
                    }
                    break
                default:
                    if (tagName.indexOf('ms-') === 0) {
                        if (!attrs['ms-widget']) {
                            attrs.is = tagName
                            attrs['ms-widget'] = '{is:' + avalon.quote(tagName) + '}'
                        }
                    }
                    break
            }

            if (handler.start) {
                handler.start(tagName, attrs, unary)
            }
        }
    }

    function parseEndTag(tag, tagName) {
        // If no tag name is provided, clean shop
        if (!tagName) {
            var pos = 0;

            // Find the closest opened tag of the same type
        } else {
            for (var pos = stack.length - 1; pos >= 0; pos--) {
                if (stack[pos] == tagName) {
                    break;
                }
            }
        }
        if (pos >= 0) {
            // Close all the open elements, up the stack
            for (var i = stack.length - 1; i >= pos; i--) {
                if (handler.end) {
                    handler.end(stack[i]);
                }
            }
            // Remove the open elements from the stack
            stack.length = pos;
        }
    }
};

var eventMap = avalon.oneObject('animationend,blur,change,input,click,dblclick,focus,keydown,keypress,keyup,mousedown,mouseenter,mouseleave,mousemove,mouseout,mouseover,mouseup,scan,scroll,submit')

avalon.toVTree = function (html) {
    // There can be only one of these elements
    var one = avalon.oneObject("html,head,body,title");

    // Enforce a structure for the document
    var structure = {
        link: "head",
        base: "head"
    }

    var elems = []// 正在处理的节点栈
    var result = []  //顶层节点集合
    var curParentNode;

    HTMLParser(html, {
        start: function (tagName, attrs, isVoidTag) {
            // If it's a pre-built element, then we can ignore
            // its construction
            if (one[tagName]) {
                curParentNode = one[tagName]
                if (!isVoidTag) {
                    elems.push(curParentNode)
                }
                return
            }

            var elem = {
                type: tagName,
                nodeType: 1,
                children: [],
                props: {},
                dirs: {},
                isVoidTag: !!isVoidTag
            }

            if (!curParentNode) {
                result.push(elem)
            }
            parseDirectives(elem, attrs)

            if (structure[tagName] && typeof one[structure[tagName]] != "boolean") {
                one[structure[tagName]].children.push(elem)

            } else if (curParentNode) {
                curParentNode.children.push(elem)
            }
            if (!isVoidTag) {
                elems.push(elem)
                curParentNode = elem
            }
        },
        end: function (tag) {
            elems.length -= 1
            // Init the new parentNode
            curParentNode = elems[elems.length - 1]
        },
        chars: function (text) {
            if (/\S/.test(text)) {
                var node = {
                    nodeType: 3,
                    type: '#text',
                    nodeValue: text
                }
                if (!curParentNode) {
                    result.push(node)
                }
                curParentNode.children.push(node)
            }
        },
        comment: function (text) {
            var node = {
                nodeType: 8,
                type: '#comment',
                nodeValue: text
            }
            if (!curParentNode) {
                result.push(node)
            }
            curParentNode.children.push(node)
        }
    })

    return result
}

function parseDirectives(elem, attrs) {
    var bindings = []
    for (var name in attrs) {

        var value = attrs[name]
        var match = name.match(rbinding)
        if (match) {
            var type = match[1]
            var param = match[2] || ""
            if (eventMap[type]) {
                var order = parseFloat(param) || 0
                param = type
                type = 'on'
            }
            name = 'ms-' + type + (param ? '-' + param : '')
            var d = avalon.directives[type]
            var binding = {
                type: type,
                param: param,
                name: name,
                expr: value,
                priority: d && d.priority || type.charCodeAt(0) * 100
            }
            if (type === 'on') {
                order = order || 0
                binding.name += '-' + order
                binding.priority = param.charCodeAt(0) * 100 + order
            }

            bindings.push(binding)
            elem.dirs[name] = binding
        } else {
            elem.props[name] = value
        }
    }

    if (elem.dirs['ms-skip']) {
        elem.props['ms-skip'] = 'true'
        bindings = []
    }
    if (!bindings.length) {
        elem.skipAttrs = true
        delete elem.dirs
    } else {
        //得到所有绑定属性的执行顺序
        elem.order = bindings.sort(byPriority).map(function (el) {
            return el.name
        }).join(';')
    }
}

function byPriority(a, b) {
    return a.priority - b.priority
}
