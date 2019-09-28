const WOQLResultsViewer = require('../query/WOQLResultsViewer');
const WOQLQuery = require('../query/WOQLQuery');
const UTILS= require('../Utils')

function Datatables(ui){}

Datatables.prototype.convertToDatatable = function(tab, ui){
    var table = jQuery(tab).DataTable({
         searching : false,
         pageLength: 25,
         lengthMenu: [10, 25, 50, 75, 100],
         paging    : true,
         select    : true,
         columnDefs:[{targets:'_all',className:"truncate"}],
         createdRow: function(row) {
                            var td = $(row).find(".truncate");
                            td.attr("title", td.html());}
    }); //jQuery(tab)

    // on click of row connect to db, on click of 5th column delete db
    jQuery(tab, 'tbody').on('click', 'td', function(){
        if(table.cell(this).index().column == 5){
            var dbInfo = table.row(jQuery(this).parents('tr')).data();
            var dbId = UTILS.extractValueFromCell(dbInfo[0]);
            ui.deleteDatabase(dbId);
            return;
        }
        else ui.showDBMainPage();
     }); // on click

    tab.setAttribute('class'      , 'stripe dataTable terminus-db-size');
    tab.setAttribute('cellpadding', '1');
    tab.setAttribute('cellspacing', '0');
    tab.setAttribute('border'     , '0');
    return tab;
}

/*
    dcb: datatable drawCallBack reference
    ui: terminus ui reference
    dt: datatable reference
    query: new woqlquery with current pagination changes
    pageInfo: current drawCallBack page change info
    resultDOM: result dom on veiwer page
*/
Datatables.prototype.executeQuery = function(dcb, ui, dt, query, pageInfo, wQuery, wrViewer, resultDOM){
    var self = this;
    //dcb.wquery.execute(query)
    wQuery.execute(query)
      .then(function(result){
          var dtResult = {};
          dtResult = wrViewer.getDtTableDOMOnChange(result.bindings, resultDOM, pageInfo)
          self.getDataFromServer(dtResult, wrViewer, ui, wQuery, resultDOM);
      })
      .catch(function(err){
          console.error(err);
          self.ui.showError(err);
      });
}

/* get query string based on datatable pagination and current query */
Datatables.prototype.getQueryOnPagination = function(wq, settings){
    switch(settings.query){
        case 'Show_All_Documents':
            return wq.getAllDocumentQuery(null, settings.pageLength, settings.start);
        break;
        case 'Show_All_Data':
            return wq.getEverythingQuery(null, settings.pageLength, settings.start);
        break;
        case 'Show_All_Schema_Elements':
            return wq.getElementMetaDataQuery(null, settings.pageLength, settings.start);
        break;
        case 'Show_Document_Classes':
        	var sqp = wq.getConcreteDocumentClassPattern("Class");
            return wq.getClassMetaDataQuery(sqp);
        break;
        case 'Show_All_Properties':
            return wq.getPropertyListQuery(null, settings.pageLength, settings.start);
        break;
        case 'Show_All_Classes':
            return wq.getClassMetaDataQuery(null, settings.pageLength, settings.start);
        break;
        case 'Show_Data_Class':
            return  wq.getDataOfChosenClassQuery(settings.chosenValue, settings.pageLength, settings.start);
        break;
        case 'Show_Property_Class':
            return wq.getDataOfChosenPropertyQuery(settings.chosenValue, settings.pageLength, settings.start);
        break;
        case 'Show_Document_Info_by_Id':
            return wq.getDocumentQuery(settings.chosenValue, settings.pageLength, settings.start);
        break;
        default:
            console.log('Invalid woql option passed');
        break;

    }
}

/*
    dcb: datatable drawCallBack reference
    ui: terminus ui reference
    dt: datatable reference
    pageInfo: current drawCallBack page change info
*/
Datatables.prototype.generateNewQueryOnPageChange = function(dcb, ui, dt, wQuery, pageInfo){
    //dcb.wquery = new WOQLQuery.WOQLQuery(ui.client, {}, ui);
    UTILS.deleteStylizedEditor(ui, pageInfo.qTextDom);
    var query = dt.getQueryOnPagination(wQuery, pageInfo)
    pageInfo.qTextDom.value = JSON.stringify(query);
    UTILS.stylizeEditor(ui, pageInfo.qTextDom, 'query', 'javascript');
    return query;
}

/*
    dt: Datatable reference
    len : current number of records to display
*/
Datatables.prototype.getCallbackSettings = function(dt, len, start){
    var pageInfo = {};
    pageInfo.pageLength = len;
    pageInfo.start      = start;
    pageInfo.qTextDom   = dt.qTextDom;
    pageInfo.query      = dt.query;
    pageInfo.chosenValue = dt.chosenValue;
    return pageInfo;
}

/*
    tab: datatable table dom
    settings : settings from woql txt generator
    resultDOM: result dom of viewer
*/
Datatables.prototype.setUp = function(tab, settings, resultDOM){
    // delete previous datatable
    TerminusClient.FrameHelper.removeChildren(this.dtdom);
    this.dtdom = document.createElement('div');
    this.dtdom.appendChild(tab);
    resultDOM.appendChild(this.dtdom);
    // saving query text box dom to change limit value on change of datatable page length
    this.qTextDom = settings.qTextDom;
    this.query = settings.query;
    this.chosenValue = settings.chosenValue;
}


Datatables.prototype.getDataFromServer = function(dtResult, wrViewer, ui, wQuery, resultDOM){
    var dt = this;
    var tab = dtResult.tab;
    this.setUp(tab, wrViewer.settings, resultDOM);
    // initialize datatables
    var table = jQuery(tab).DataTable({
         searching   : false,
         pageLength  : wrViewer.settings.pageLength,
         serverSide  : true,
         processing  : true,
         lengthMenu  : [5, 10, 25, 50, 75, 100],
         dom         : 'Blfrtip',
         columns     : dtResult.result.columns,
         paging      : true,
         select      : true,
         ajax        : function (data, callback, settings) {
                        callback(
                            dtResult.result.data
                        );},
         buttons     : [{ extend: 'copy', text: 'Copy to clipboard' },
                        { extend: 'excel', text: 'Export to Excel' }],
         columnDefs  :[{targets:'_all',className:"truncate"}],
         createdRow  : function(row){
                            var td = $(row).find(".truncate");
                            td.attr("title", td.html());},
         colReorder  : {addFixed : true, liveDrag:true},
         scrollX     : true,
         drawCallback: function(settings) {
                             // on change of page length
                             $(this).on( 'length.dt', function (e, settings, len){
                                  var info = table.page.info();
                                  var pageInfo = dt.getCallbackSettings(dt, len, info.start);
                                  var query = dt.generateNewQueryOnPageChange(this, ui, dt, wQuery, pageInfo);
                                  return dt.executeQuery(this, ui, dt, query, pageInfo, wQuery, wrViewer, resultDOM);
                             });
                             // pagination
                             $(this).on( 'page.dt', function () {
                                var info = table.page.info();
                                var pageInfo = dt.getCallbackSettings(dt, info.length, info.start);
                                var query = dt.generateNewQueryOnPageChange(this, ui, dt, wQuery, pageInfo);
                                return dt.executeQuery(this, ui, dt, query, pageInfo, wQuery, wrViewer, resultDOM);
                             });
        }
    }); //jQuery(tab)

    //styling
    tab.setAttribute('class'      , 'stripe dataTable');
    //tab.setAttribute('style'       , 'table-layout: fixed;')
    tab.setAttribute('cellpadding', '1');
    tab.setAttribute('cellspacing', '1');
    tab.setAttribute('border'     , '0');

    return tab;
}

/*
serverside: true or false
*/
Datatables.prototype.draw = function(serverside, dtResult, wrViewer, ui, wQuery, resultDOM){
    if(serverside)
        return(this.getDataFromServer(dtResult, wrViewer, ui, wQuery, resultDOM));
    else return(this.convertToDatatable(dtResult, ui));
}

module.exports=Datatables
