function(properties, context) {

console.log('step1');
var phantom = require("phantom");
var _ph;
var _page;
var _outObj;


return context.async(function(cb){
    
phantom.create().then(function(ph){ 
    _ph = ph;
    cb( undefined , { create : String(_ph.createPage()) });
}).then(function(page){
    _page = page;
    cb( undefined , { page : String(_page.open('https://stackoverflow.com/')) });
}).then(function(status) {
    cb( undefined , { status : String(_page.property('content')) });
}).then(function(content) {
    cb( undefined , { content : String(content) });        
    _page.close();
    _ph.exit();
}).catch(function(err) {
    cb(err);
});
});
    

}