var patch = require('../strategy/patch')
var uniqueID = 1
//ms-for ms-effect ms-if  ms-widget ...
avalon.directive('if', {
    priority: 2,
    parse: function (binding, num) {
        var ret = 'var ifVar = '+ avalon.parseExpr(binding,'if')+';\n'
        ret += 'vnode' + num + '.props["ms-if"] = ifVar;\n'
        ret += 'if(!ifVar){\n\
                vnode'+ num +'.nodeType = 8;\n\
                vnode'+num+'.directive="if";\n\
                vnode'+num+'.nodeValue="ms-if"\n}\n'
        return ret
    },
    diff: function (cur, pre, steps) {
        cur.dom = pre.dom
        if (cur.nodeType !== pre.nodeType) {
            var list = cur.change || (cur.change = [])
            if (avalon.Array.ensure(list, this.update)) {
                steps.count += 1
                cur.steps = steps
            }
        }
    },
    update: function (node, vnode, parent) {
        var dtype = node.nodeType
        var vtype = vnode.nodeType
        if (dtype !== vtype) {
            if (vtype === 1) {
                //要插入元素节点,将原位置上的注释节点移除并cache
                var element = vnode.dom
                if (!element) {
                    element = avalon.vdomAdaptor(vnode, 'toDOM')
                    vnode.dom = element
                }
                parent.replaceChild(element, node)
                if (vnode.steps.count) {
                    patch([element], [vnode], parent, vnode.steps)
                }
                avalon.applyEffect(node,vnode,'onEnterDone',avalon.noop)
                return (vnode.steps = false)
            } else if (vtype === 8) {
                //要移除元素节点,在对应位置上插入注释节点
                avalon.applyEffect(node,vnode,'onLeaveDone',function(){
                    var comment = node._ms_if_ ||
                        (node._ms_if_ = document.createComment(vnode.nodeValue))
                
                    parent.replaceChild(comment, node)
                })
            }
        }
    }
})

