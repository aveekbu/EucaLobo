//
//  Author: Vlad Seryakov vseryakov@gmail.com
//  May 2012
//


var ew_VpcsTreeView = {
    model: [ "vpcs", "subnets", "securityGroups", "routeTables", "networkAcls", "instances", "internetGateways", 'dhcpOptions', 'availabilityZones', 'vpnGateways', 'customerGateways', 'vpnConnections' ],

    menuChanged : function()
    {
        document.getElementById("ew.vpcs.contextmenu").disabled = (this.getSelected() == null);
    },

    selectionChanged: function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        var list = [];
        var tables = this.core.queryModel('routeTables','vpcId', vpc.id);
        var igws = this.core.queryModel('internetGateways','vpcId', vpc.id);
        var acls = this.core.queryModel('networkAcls','vpcId', vpc.id);
        var enis = this.core.queryModel('networkInterfaces','vpcId', vpc.id);
        var vgws = this.core.queryModel('vpnGateways');
        var vpns = this.core.queryModel('vpnConnections');
        var cgws = this.core.queryModel('customerGateways');
        var subnets = this.core.queryModel('subnets','vpcId', vpc.id);
        var instances = this.core.queryModel('instances','vpcId', vpc.id);
        var groups = this.core.queryModel('securityGroups','vpcId', vpc.id);

        if (subnets.length) {
            list.push({ name: "Subnets", folder: 1 });
            for (var i in subnets) {
                list.push({ name: "     " + subnets[i].toString() });
                var found = false;
                for (var j in tables) {
                    for (var k in tables[j].associations) {
                        if (tables[j].associations[k].subnetId == subnets[i].id) {
                            if (!found) {
                                found = true;
                                list.push({ name: "         Routes", folder: 1});
                            }
                            for (var n in tables[j].routes) {
                                list.push({ name: "             " + tables[j].routes[n].toString() });
                            }
                            break;
                        }
                    }
                }
                found = false;
                for (var j in acls) {
                    for (var k in acls[j].associations) {
                        if (acls[j].associations[k].subnetId == subnets[i].id) {
                            if (!found) {
                                found = true;
                                list.push({ name: "         Network ACLs", folder: 1 });
                            }
                            for (var n in acls[j].rules) {
                                list.push({ name: "            " + acls[j].rules[n].toString() });
                            }
                            break;
                        }
                    }
                }
            }
        }

        var found = false;
        for (var j in tables) {
            if (!tables[j].associations.length) {
                if (!found) {
                    found = true;
                    list.push({ name: "Route Tables", folder: 1});
                }
                list.push({ name: "     " + tables[j].toString() });
            }
        }

        this.listToInfo(igws, "Internet Gateways", list);
        this.listToInfo(instances, "Instances", list);
        this.listToInfo(groups, "Security Groups", list);
        this.listToInfo(enis, "Network Interfaces", list);

        if (vgws.length) {
            var found = false;
            for (var i in vgws) {
                for (var j in vgws[i].attachments) {
                    if (vgws[i].attachments[j].vpcId == vpc.id) {
                        if (!found) {
                            found = true;
                            list.push({ name: "VPN Gateways", folder: 1 });
                        }
                        list.push({ name: "     " + vgws[i].toString() });
                    }
                }
            }
        }
        var gws = [];
        if (vpns.length) {
            var found = false;
            for (var i in vpns) {
                for (var j in vgws) {
                    if (vgws[j].id != vpns[i].vgwId) continue;
                    for (var k in vgws[j].attachments) {
                        if (vgws[j].attachments[k].vpcId == vpc.id) {
                            gws.push(vpns[i].cgwId); // Remember customer gateways
                            if (!found) {
                                found = true;
                                list.push({ name: "VPN Connections", folder: 1 });
                            }
                            list.push({ name: "     " + vpns[i].toString() });

                        }
                    }
                }
            }
        }

        if (cgws.length) {
            var found = false;
            for (var i in cgws) {
                for (var j in gws) {
                    if (gws[j] == cgws[i].id) {
                        if (!found) {
                            found = true;
                            list.push({ name: "Customer Gateways", folder: 1 });
                        }
                        list.push({ name: "     " + cgws[i].toString()});
                    }
                }
            }
        }
        ew_VpcsInfoTreeView.display(list);
    },

    listToInfo: function(items, title, list)
    {
        if (items.length) {
            list.push({ name: title, folder: 1 });
            for (var i in items) {
                list.push({ name: "     " + items[i].toString() });
            }
        }
    },

    createSubnet : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        ew_SubnetsTreeView.createSubnet(vpc.id);
    },

    createVpc : function()
    {
        var me = this;
        var inputs = [ {label:"VPC",help:"Specify IP block for a VPC and optionally name for easy navigation in the system",type:"section"},
                       {label:'IP CIDR block:',type:'cidr',required:1,help:"Example: 10.0.0.0/16"},
                       {label:'Tenancy',type:'menulist',list:["default","dedicated"],required:1},
                       {label:'VPC Name:'},
                       {label:"Subnets",type:"section",help:"Optionally, create one or both subnets in the new VPC:"},
                       {label:'Public Subnet',help:"Example: 10.1.0.0/24"},
                       {label:'Private Subnet',help:"Example: 10.2.0.0/24"},
                       {label:'Availability Zone',type:'menulist',list: this.core.queryModel('availabilityZones'),key:'name'},
                       {label:"VPN Connection",type:"section",help:"Optionally, create VPN connection to your VPC:"},
                       {label:'Customer Gateway IP',type:'ip'},
                       {label:'BGP ASN',value:65000},
                       ];

        var values = this.core.promptInput("Create VPC", inputs);
        if (values) {
            this.core.api.createVpc(values[1], values[2], function(vpcId) {
                if (values[3]) {
                    me.core.setTags(vpcId, "Name:" + values[3], function() { me.refresh(); });
                } else {
                    me.refresh();
                }

                // Public subnet
                if (values[5]) {
                    me.core.api.createSubnet(vpcId, values[5], values[7], function(subnetId) {
                        me.core.api.createInternetGateway(function(igwId) {
                            me.core.api.attachInternetGateway(igwId, vpcId, function() {
                                me.core.api.createRouteTable(vpcId, function(tableId) {
                                    me.core.api.associateRouteTable(tableId, subnetId, function() {
                                        me.core.api.createRoute(tableId, "0.0.0.0/0", igwId, null, null, function() {
                                            ew_SubnetsTreeView.refresh(true);
                                        });
                                    });
                                });
                            });
                        });
                    });
                }

                // Private subnet
                if (values[6]) {
                    me.core.api.createSubnet(vpcId, values[6], values[7], function(id) {
                        ew_SubnetsTreeView.refresh(true);
                    });
                }

                // VPN
                if (values[9] && values[10]) {
                    me.core.api.createCustomerGateway("ipsec.1", values[9], values[10], function(cgwId) {
                        me.core.api.createVpnGateway("ipsec.1", values[7], function(vgwId) {
                            me.core.api.attachVpnGatewayToVpc(vgwId, vpcId, function() {
                                me.core.api.createVpnConnection("ipsec.1", cgwId, vgwId, function(vpnId) {
                                    me.refreshModel('vpnGateways', 'customerGateways', 'vpnConnections');
                                });
                            });
                        });
                    });
                }
            });
        }
    },

    deleteVpc : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        var instances = this.core.queryModel('instances','vpcId', vpc.id, 'state', 'running');
        if (instances.length) {
            alert("There is a running instance (" + instances[0].id + ") in this VPC.\n\nThis VPC cannot be deleted until all instances have been terminated.");
            return;
        }

        if (!confirm("You must delete all Subnets, Security Groups, Network ACLs, DHCP Options Sets, Network Interfaces, Route Tables, Internet Gateways, and VPN Attachments associated with this VPC before you can delete the VPC itself.\n\nContinue to delete " + vpc.toString() + "?")) return;

        var me = this;
        this.core.api.deleteVpc(vpc.id, function() { me.refresh(); });
    },

    setDhcpOptions : function()
    {
        var me = this;
        var vpc = this.getSelected();
        if (vpc == null) return;

        var vpcs = this.core.queryModel('vpcs');
        var dhcps = this.core.queryModel('dhcpOptions');
        var values = this.core.promptInput('Associate DHCP Options', [{label:"VPC",type:"menulist",list:vpcs,value:vpc.id,required:1},
                                                                      {label:"DHCP Options",type:"menulist",list:dhcps,required:1}]);
        if (!values) return;
        this.core.api.associateDhcpOptions(values[1], values[0], function() { me.refresh(); });
    },

    attachToVpnGateway : function()
    {
        var me = this;
        var vpc = this.getSelected();
        if (vpc == null) return;

        var vgws = this.core.queryModel('vpnGateways');

        var values = this.core.promptInput("Attach VPN Gateway", [{label:"VPC",type:"label",value:vpc.id,required:1},
                                                                  {label:"VPN Gateway",type:"menulist",list:vgws,required:1}, ]);
        if (!values) return;
        this.core.api.attachVpnGatewayToVpc(values[1], values[0], function() { me.refresh(); });
    },

    attachToInternetGateway : function()
    {
        var vpc = this.getSelected();
        if (vpc == null) return;

        ew_InternetGatewayTreeView.attachInternetGateway(vpc.id, null);
    },
};

var ew_VpcsInfoTreeView = {

    cycleHeader : function(col) {
    },
    sort : function() {
    },
    getCellProperties : function(idx, column, prop)
    {
        if (this.treeList[idx].folder) {
            prop.AppendElement(this.getAtom("bold"));
        }
    },
};

var ew_DhcpoptsTreeView = {
    model: "dhcpOptions",

    menuChanged : function() {
        var image = this.getSelected();
        document.getElementById("ew.dhcpopts.contextmenu").disabled = (image == null);
    },

    deleteDhcpOptions : function() {
        var opts = this.getSelected();
        if (opts == null) return;
        if (!confirm("Delete " + opts.toString() + "?")) return;
        var me = this;
        this.core.api.deleteDhcpOptions(opts.id, function() { me.refresh(); });
    },

    createDhcpOptions : function () {
        var me = this;
        var values = this.core.promptInput('Create DHCP Options', [ {label: "Enter the host's domain name (e.g.: example.com)" },
                                                                    {label: "Enter up to 4 DNS server IP addresses, separated by commas"},
                                                                    {label: "Enter up to 4 NTP server IP addresses, separated by commas"},
                                                                    {label: "Enter up to 4 NetBIOS name server IP addresses, separated by commas"},
                                                                    {label: "Enter the NetBIOS node type (2: P-Node)" }]);
        if (!values) return;
        var params = {};
        if (values[0]) {
            params["domain-name"] = values[0];
        }
        if (values[1]) {
            params["domain-name-servers"] = values[1].split(",");
        }
        if (values[2]) {
            params["ntp-servers"] = values[2].split(",");
        }
        if (values[3]) {
            params["netbios-name-servers"] = values[3].split(",");
        }
        if (values[4]) {
            params["netbios-node-type"] = values[4];
        }
        this.core.api.createDhcpOptions(params, function() { me.refresh(); });
    },
};


var ew_SubnetsTreeView = {
    model: [ "subnets", "vpcs", "routeTables", "networkAcls", "internetGateways", "availabilityZones" ],

    menuChanged : function()
    {
        $("ew.subnets.contextmenu").disabled = (this.getSelected() == null);
    },

    deleteSubnet : function()
    {
        var subnet = this.getSelected();
        if (subnet == null) return;

        var instances = this.core.queryModel('instances', 'subnetId', subnet.id, 'state', 'running');
        if (instances.length) {
            alert("There is instance " + instances[0].toString() + " in this subnet");
            return false;
        }

        if (!confirm("Delete " + subnet.toString() + "?")) return;

        var me = this;
        this.core.api.deleteSubnet(subnet.id, function() { me.refresh(); });
    },

    createSubnet : function(vpcId)
    {
        var me = this;
        var subnet = this.getSelected();
        var azones = this.core.queryModel('availabilityZones');
        var vpcs = this.core.queryModel('vpcs');

        var inputs = [{label:'VPC',type:'menulist',list:vpcs,value:vpcId || (subnet && subnet.vpcId),required:1,oncommand:"rc.items[1].obj.value=rc.items[0].list[rc.items[0].obj.selectedIndex].cidr"},
                      {label:'Subnet CIDR Block',type:'cidr',required:1} ,
                      {label:'Subnet Name'} ,
                      {label:'Availability zone',type:'menulist',list:azones,empty:1},
                      {label:'Public Subnet?',type:'checkbox',help:"Internet Gateway will be created if does not exist yet"} ];

        var values = this.core.promptInput('Create Subnet', inputs);
        if (!values) return;

        // Do not create IGW if VPC alredy has it
        var igws = this.core.queryModel('internetGateways','vpcId', values[0]);

        function wrap() {
            if (values[4] && igws.length == 0) {
                me.core.api.createInternetGateway(function(igwId) {
                    me.core.api.attachInternetGateway(igwId, values[0], function() {
                        me.refresh(true);
                    });
                });
            } else {
                me.refresh();
            }
        }
        this.core.api.createSubnet(values[0], values[1], values[3], function(subnetId) {
            if (values[2] && subnetId) {
                me.core.setTags(subnetId, "Name:" + values[2], wrap);
            } else {
                wrap();
            }
        });
    },

    selectionChanged: function(event)
    {
        var item = this.getSelected();
        if (!item) return;
        ew_SubnetRoutesTreeView.display(item.routes);
        ew_SubnetAclRulesTreeView.display(item.rules);
    },

    display: function(list)
    {
        if (!this.isVisible()) return;
        var tables = this.core.queryModel('routeTables');
        var acls = this.core.queryModel('networkAcls');
        for (var k in list) {
            var igws = this.core.queryModel('internetGateways', 'vpcId', list[k].vpcId);
            if (igws.length) {
                list[k].igwId = igws[0].id;
            }
            for (var i in tables) {
                for (var j in tables[i].associations) {
                    if (tables[i].associations[j].subnetId == list[k].id) {
                        list[k].routes = tables[i].routes;
                        list[k].tableId = tables[i].id;
                        list[k].routeTable = tables[i];
                        list[k].routeAssocId = tables[i].associations[j].id;
                        break;
                    }
                }
            }

            for (var i in acls) {
                for (var j in acls[i].associations) {
                    if (acls[i].associations[j].subnetId == list[k].id) {
                        list[k].rules = acls[i].rules;
                        list[k].aclId = acls[i].id;
                        list[k].networkAcl = acls[i];
                        list[k].aclAssocId = acls[i].associations[j];
                        break;
                    }
                }
            }
        }
        TreeView.display.call(this, list);
    },

    associateACL : function()
    {
        var subnet = this.getSelected();
        if (!subnet) return;

        var acls = this.core.queryModel('networkAcls', 'vpcId', subnet.vpcId);
        if (!acls.length) {
            alert("No ACLs available for subnets with VPC ID " + subnet.vpcId + ", please try later");
            return;
        }
        var rc = this.core.promptList("Replace Network ACL", "Select ACL", acls, { columns: [ "id", "vpcId" ] });
        if (rc < 0) {
            return;
        }
        this.core.api.ReplaceNetworkAclAssociation(subnet.aclAssocId.id, acls[rc].id, function() { ew_SubnetsTreeView.refresh(); });
    },

    associateRoute : function()
    {
        var subnet = this.getSelected();
        if (!subnet) return;

        var routes = this.core.queryModel('routeTables');
        if (!routes) {
            alert("No route tables available, try later");
            return;
        }
        var rc = this.core.promptList("Associate Route Table", "Select route table", routes, { columns: [ "id", "vpcId" ] });
        if (rc < 0) {
            return;
        }
        this.core.api.associateRouteTable(routes[rc].id, subnet.id, function () { ew_SubnetsTreeView.refresh(); });
    },

    disassociateRoute: function()
    {
        var subnet = this.getSelected();
        if (!subnet || !subnet.routeAssocId) return;

        if (!confirm("Delete route association " + subnet.routeTable + "?")) return;
        this.core.api.disassociateRouteTable(subnet.routeAssocId, function () { ew_SubnetsTreeView.refresh(); });

    },

    createRoute : function(table)
    {
        var subnet = this.getSelected();
        if (!subnet || !subnet.routeTable) return;
        ew_RoutesTreeView.createRoute(subnet.routeTable);
    },

    createRule: function()
    {
        var subnet = this.getSelected();
        if (!subnet || !subnet.networkAcl) return alert('No Network ACL attached');
        ew_NetworkAclRulesTreeView.createRule(subnet.networkAcl);
    },

};

var ew_SubnetRoutesTreeView = {

    deleteRoute : function(item)
    {
        var item = this.getSelected();
        if (!item) return alert('No Route Table attached');
        if (item.gatewayId == "local") return alert('Cannot delete local route');
        if (!confirm("Delete route  " + item.cidr + "?")) return;
        this.core.api.deleteRoute(item.tableId, item.cidr, function() { ew_SubnetsTreeView.refresh(); });
    },
};

var ew_SubnetAclRulesTreeView = {

    deleteRule: function()
    {
        var item = this.getSelected();
        if (item)
        {
          if (item.num == 32767) {
            alert("Implicit ACL rules cannot be deleted");
          } else if (confirm("Delete ACL rule " + item.num + "?")) {
            this.core.api.deleteNetworkAclEntry(item.aclId, item.num, item.egress, function() { ew_NetworkAclsTreeView.refresh(); ew_SubnetsTreeView.refresh(); });
          }
        }
    },
};

var ew_RouteTablesTreeView = {
    model : [ "routeTables", "vpcs", "subnets","instances",'vpnGateways',"internetGateways","networkInterfaces" ],

    selectionChanged : function()
    {
        var table = this.getSelected();
        if (table == null) return;

        ew_RoutesTreeView.display(table.routes);
        ew_RouteAssociationsTreeView.display(table.associations);
    },

    createTable : function()
    {
        var vpcs = this.core.queryModel('vpcs');
        if (!vpcs) {
            alert("No VPCs available, try later");
            return;
        }
        var rc = this.core.promptList("Create Route Table", "Select VPC", vpcs, {columns: [ 'id', 'cidr' ] });
        if (rc < 0) {
            return;
        }

        var me = this;
        this.core.api.createRouteTable(vpcs[rc].id, function() { me.refresh(); });

    },

    deleteSelected : function()
    {
        var table = this.getSelected();
        if (!table || table.main == "true") return;
        if (!confirm("Delete route table " + table.id + "?")) return;
        var me = this;
        this.core.api.deleteRouteTable(table.id, function() { me.refresh(); });
    },

    enablePropagation: function() {
        var me = this;
        var table = this.getSelected();
        if (!table) return;

        var vgws = this.core.queryModel('vpnGateways');
        var idx = this.core.promptList("Enable Propagation to VPG Gateway", "Select VPN gateway:", vgws);
        if (idx >= 0) {
            this.core.api.enableVgwRoutePropagation(vgws[idx], table.id, function() { me.refresh(); });
        }
    },

    disablePropagation: function() {
        var me = this;
        var table = this.getSelected();
        if (!table || !table.propagations.length) return;
        var idx = this.core.promptList("Disable Propagation to VPG Gateway", "Select VPN gateway:", table.propagations);
        if (idx >= 0) {
            this.core.api.disableVgwRoutePropagation(table.propagations[idx].gatewayId, table.id, function() { me.refresh(); });
        }
    },

};

var ew_RoutesTreeView = {

    createRoute : function(table)
    {
        if (!table) table = ew_RouteTablesTreeView.getSelected();
        if (!table) return;
        var gws = this.core.queryModel('internetGateways', 'vpcId', table.vpcId);
        gws = gws.concat(this.core.queryModel('vpnGateways', 'vpcId', table.vpcId));

        var instances = this.core.queryModel('instances', 'vpcId', table.vpcId);
        var enis = this.core.queryModel('networkInterfaces', 'vpcId', table.vpcId);

        var values = this.core.promptInput("Create Route",
                                    [{label:"Route Table",type:"description",value:table.toString(),style:"max-width:350px;"},
                                     {label:"CIDR",type:"cidr",required:1},
                                     {type:"label",value:"Please choose one of the following resources:",notitle:0},
                                     {label:"Internet/VPN Gateway",type:"menulist",list:gws,style:"max-width:350px;",oncommand:"rc.items[4].obj.value=null,rc.items[5].obj.value=null;"},
                                     {label:"Instance",type:"menulist",list:instances,style:"max-width:350px;",oncommand:"rc.items[3].obj.value=null,rc.items[5].obj.value=null;"},
                                     {label:"Network Interface",type:"menulist",list:enis,style:"max-width:350px;",oncommand:"rc.items[3].obj.value=null,rc.items[4].obj.value=null;"}]);
        if (!values) return;
        this.core.api.createRoute(table.id, values[1], values[3], values[4], values[5], function() {
            ew_RouteTablesTreeView.refresh();
            ew_SubnetsTreeView.refresh();
        });
    },

    deleteRoute : function(item)
    {
        var item = this.getSelected();
        if (!item || item.gatewayId == "local") return;
        if (!confirm("Delete route  " + item.cidr + "?")) return;
        this.core.api.deleteRoute(item.tableId, item.cidr, function() { ew_RouteTablesTreeView.refresh(); });
    },
};

var ew_RouteAssociationsTreeView = {

    createAssociation : function()
    {
        var table = ew_RouteTablesTreeView.getSelected();
        if (!table) {
            alert("Please select route table");
            return;
        }
        var subnets = this.core.queryModel('subnets');
        if (!subnets) {
            alert("No subnets available, try later");
            return;
        }
        var rc = this.core.promptList("Create Route", "Select subnet", subnets, { columns: [ "id", "cidr" ] });
        if (rc < 0) {
            return;
        }
        this.core.api.associateRouteTable(table.id, subnets[rc].id, function() { ew_RouteTablesTreeView.refresh(); });
    },

    deleteAssociation : function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item || !item.subnetId || !confirm("Delete route association " + item.id + ":" + item.subnetId + "?")) return;
        this.core.api.disassociateRouteTable(item.id, function() {
            ew_RouteTablesTreeView.refresh();
            me.core.refreshModel('subnets');
        });
    },
};

var ew_NetworkAclsTreeView = {
    model : [ "networkAcls", "subnets", "vpcs" ],

    selectionChanged: function(event)
    {
        var acl = this.getSelected();
        if (acl == null) return

        ew_NetworkAclRulesTreeView.display(acl.rules);
        ew_NetworkAclAssociationsTreeView.display(acl.associations);
    },

    createACL : function()
    {
        var vpcs = this.core.queryModel('vpcs');
        if (!vpcs) return alert("No VPCs available, try later");
        var rc = this.core.promptList("Create Network ACL", "Select VPC", vpcs, { columns: ['id', 'cidr' ] });
        if (rc < 0) return;
        var me = this;
        this.core.api.createNetworkAcl(vpcs[rc].id, function() { me.refresh(); });

    },

    deleteACL : function()
    {
        var acl = this.getSelected();
        if (!acl || !confirm("Delete Network ACL " + acl.id + "?")) return;
        var me = this;
        this.core.api.deleteNetworkAcl(acl.id, function() { me.refresh(); });
    },

    associateACL : function()
    {
        var acl = this.getSelected();
        if (!acl) return alert("Please select an ACL");
        var subnets = this.core.queryModel('subnets', 'vpcId', acl.vpcId);
        if (!subnets.length) return alert("No subnets available, try later");
        var rc = this.core.promptList("Associate with VPC Subnet", "Select subnet", subnets, { columns: [ "id", "cidr" ] });
        if (rc < 0) return;

        // Replace existing association, can only be one
        var acls = this.core.getModel('networkAcls');
        for (var i in acls) {
            for (var j in acls[i].associations) {
                if (acls[i].associations[j].subnetId == subnets[rc].id) {
                    this.core.api.ReplaceNetworkAclAssociation(acls[i].associations[j].id, acl.id, function() { ew_NetworkAclsTreeView.refresh(); });
                    return;
                }
            }
        }
        alert("Could not find existing Subnet association");
    },
};

var ew_NetworkAclAssociationsTreeView = {

};

var ew_NetworkAclRulesTreeView = {

    createRule : function(acl)
    {
        if (!acl) acl = ew_NetworkAclsTreeView.getSelected();
        if (!acl) return alert("Please select ACL");
        var retVal = {ok:null};
        window.openDialog("chrome://ew/content/dialogs/create_rule.xul", null, "chrome,centerscreen,modal,resizable", acl, this.core, retVal);
        if (retVal.ok) {
            debug(JSON.stringify(retVal));
            this.core.api.createNetworkAclEntry(acl.id, retVal.num, retVal.proto, retVal.action, retVal.egress, retVal.cidr, retVal.var1, retVal.var2, function() {
                ew_NetworkAclsTreeView.refresh();
                ew_SubnetsTreeView.refresh();
            });
        }
    },

    deleteRule : function()
    {
        var item = this.getSelected();
        if (item)
        {
          if (item.num == 32767) {
            alert("Implicit ACL rules cannot be deleted");
          } else if (confirm("Delete ACL rule " + item.num + "?")) {
            this.core.api.deleteNetworkAclEntry(item.aclId, item.num, item.egress, function() { ew_NetworkAclsTreeView.refresh(); });
          }
        }

    },

};

var ew_InternetGatewayTreeView = {
    model : ["internetGateways", "vpcs"],

    create : function()
    {
        var me = this;
        this.core.api.createInternetGateway(function() { me.refresh(); });
    },

    destroy : function()
    {
        var igw = this.getSelected();
        if (!igw) return;
        if (!this.core.promptYesNo("Confirm", (igw.vpcId ? "Detach and " : "") + "Delete Internet Gateway " + igw.id + "?")) return;

        var me = this;
        if (igw.vpcId) {
            this.core.api.detachInternetGateway(igw.id, igw.vpcId, function() {
                me.core.api.deleteInternetGateway(igw.id, function() { me.refresh(); });
            });
        } else {
            this.core.api.deleteInternetGateway(igw.id, function() { me.refresh(); });
        }
    },

    attach: function(vpcid, igwid, selected)
    {
        var igw = this.getSelected();
        if (!igw) return
        this.attachInternetGateway(null, igw.id);
    },

    attachInternetGateway : function(vpcid, igwid)
    {
        var me = this;
        var vpcs = this.core.queryModel('vpcs');
        var igws = this.core.queryModel('internetGateways');
        var values = this.core.promptInput("Attach Internet Gateway", [ {label:"VPC",type:"menulist",list:vpcs,value:vpcid,required:1},
                                                                        {label:"Internet Gateway",type:"menulist",list:igws,value:igwid,required:1,oncommand:"rc.items[2].obj.checked=false;"},
                                                                        {label:"Create New Gateway",type:"checkbox",oncommand:"rc.items[1].obj.value=null"}]);
        if (!values) return;
        if (values[2]) {
            this.core.api.createInternetGateway(function(id) {
                me.core.api.attachInternetGateway(id, values[0], function() { me.refresh(); });
            });
        } else {
            this.core.api.attachInternetGateway(values[1], values[0], function() { me.refresh(); });
        }
    },

    detach : function()
    {
        var igw = this.getSelected();
        if (igw == null) return;
        if (!this.core.promptYesNo("Confirm", "Detach Internet Gateway " + igw.id + " from " + igw.vpcId + "?")) return;
        var me = this;
        this.core.api.detachInternetGateway(igw.id, igw.vpcId, function() { me.refresh(); });
    },
};

var ew_NetworkInterfacesTreeView = {
    model : [ "networkInterfaces", "vpcs", "subnets", "securityGroups", "instances" ],

    selectionChanged: function(event)
    {
        var eni = this.getSelected();
        if (eni == null) return
    },

    edit : function(event)
    {
        var me = this;
        var eni = this.getSelected();
        if (eni == null) return;

        var groups = me.core.queryModel('securityGroups', 'vpcId', eni.vpcId);
        var checked = groups.filter(function(x) { return eni.groups.some(function(y) { return y.id == x.id; }); });
        var values = this.core.promptInput("Update ENI", [{label:"ENI",type:"description",style:"max-width:350px;",value:eni},
                                                          {label:"Description",value:eni.descr},
                                                          {label:"Source Dest Check",type:"checkbox",checked:eni.sourceDestCheck},
                                                          {label:"Security Groups",type:"listview",rows:10,list:groups,checkedItems:checked}]);
        if (!values) return;
        if (eni.sourceDestCheck != values[2]) {
            this.core.api.modifyNetworkInterfaceAttribute(eni.id, "SourceDestCheck", values[2], function() { me.refresh(); });
        }
        if (eni.descr != values[1]) {
            this.core.api.modifyNetworkInterfaceAttribute(eni.id, "Description", values[1], function() { me.refresh(); });
        }
        if (values[3] && checked.toString() != values[3].toString()) {
            var attrs = [];
            for (var i = 0; i < values[3].length;i++) {
                attrs.push(['SecurityGroupId.' + (i + 1), values[3][i].id]);
            }
            this.core.api.modifyNetworkInterfaceAttributes(eni.id, attrs, function() { me.refresh(); });
        }
    },

    createInterface : function()
    {
        var me = this;
        function callback(item,idx, onstart) {
            if (onstart && idx != 3) return;
            this.rc.items[3].view.items = me.core.queryModel('securityGroups', 'vpcId', this.rc.items[0].list[this.rc.items[0].obj.selectedIndex].vpcId);
            this.rc.items[3].view.create();
        }
        var subnets = this.core.queryModel('subnets');
        var values = this.core.promptInput("Create ENI", [{label:"Subnet",type:"menulist",list:subnets,required:1,callback:callback},
                                                          {label:"Private Ip Address",type:"ip",required:1},
                                                          {label:"Description"},
                                                          {label:"Security Groups",type:"listview",rows:10,callback:callback}]);
        if (!values) return;
        this.core.api.createNetworkInterface(values[0], values[1], values[2], values[3], function() { me.refresh(); });
    },

    deleteInterface : function()
    {
        var eni = this.getSelected();
        if (!eni || !confirm("Delete Network Interface " + eni.id + "?")) return;
        var me = this;
        this.core.api.deleteNetworkInterface(eni.id, function() { me.refresh(); });
    },

    assignPrivateIps: function()
    {
        var me = this;
        var eni = this.getSelected();
        if (!eni) return;
        var values = this.core.promptInput("Assign Private IP Addresses", [{label:"List of private IP Addresses",help:"separate by comma"},
                                                                           {label:"Auto Assign IPs",type:"number",help:"specify how many IPs to auto assign"},
                                                                           {label:"",value:"Specify either IP address list or number to auto assign, not both",type:"label"},
                                                                           {label:"Allow auto reassignment of IP addresses",type:"checkbox"}]);
        if (!values) return;
        this.core.api.assignPrivateIpAddresses(eni.id, values[0] ? values[0].replace(/[ ]+/g,'').split(",") : null, values[1], values[3], function() { me.refresh();});
    },

    unassignPrivateIps: function()
    {
        var me = this;
        var eni = this.getSelected();
        if (!eni) return;
        var list = this.core.promptList('Unassign Private IPs', 'Select IPs to unassign:', eni.privateIpAddresses, { multiple: true });
        if (!list || !list.length) return;
        this.core.api.unassignPrivateIpAddresses(eni.id, list, function() { me.refresh();});
    },

    attachInterface : function()
    {
        var me = this;
        var eni = this.getSelected();
        if (!eni) return;
        var instances = this.core.queryModel('instances','vpcId', eni.vpcId, 'availabilityZone', eni.availabilityZone);
        var values = this.core.promptInput("Attach ENI", [{label:"Instance",type:"menulist",list:instances,required:1},
                                                          {label:"Device Index",type:"number",required:1}]);
        if (!values) return;
        this.core.api.attachNetworkInterface(eni.id, values[0], values[1], function() { me.refresh();});
    },

    detachInterface : function(force) {
        var eni = this.getSelected();
        if (!eni) return;

        if (!eni.attachment) {
            alert("Interface is not attached");
            return;
        }

        if (force) {
            if (!confirm("Force detach interface " + eni.id + " (" + eni.descr + ") ?")) return;
        } else {
            if (!confirm("Detach interface " + eni.id + " (" + eni.descr + ") ?")) return;
        }
        var me = this;
        this.core.api.detachNetworkInterface(eni.attachment.id, force, function() { me.refresh(); });
    },

};

var ew_VpnConnectionTreeView = {
    model: ['vpnConnections','customerGateways','vpnGateways','vpcs','subnets'],
    searchElement: 'ew.vpnconnections.search',

    isRefreshable : function()
    {
        for (var i in this.treeList) {
            if (["pending","deleting"].indexOf(this.treeList[i].state) != -1) return true;
        }
        return false;
    },

    menuChanged : function() {
        var image = this.getSelected();
        $("ew.vpnconnections.contextmenu").disabled = (image == null);
        TreeView.menuChanged.call(this);
    },

    saveConnectionConfiguration : function (name, config) {
        var file = this.core.promptForFile("Save VPN Connection Configuration", true, name + ".txt");
        if (file) {
            FileIO.write(FileIO.open(file), config);
        }
    },

    getCustomerConfig : function() {
        var vpn = this.getSelected();
        if (vpn == null) return;
        if (vpn.config == null) {
           alert("The Customer Gateway configuration for this VPN Connection is not present.");
           return;
        }

        var devices = this.core.api.queryVpnConnectionStylesheets();
        var idx = this.core.promptList("Customer Gateway configuration", "Select device type:", devices, {columns: ['title'] });
        if (idx >= 0) {
            var result = this.core.api.queryVpnConnectionStylesheets(devices[idx].filename, vpn.config);
            if (!result) {
                return alert("Error processing gateway configuration");
            }
            this.saveConnectionConfiguration(vpn.id, result);
        }
    },

    createVpnConnection : function(cgwid, vgwid) {
        var me = this;
        var vgws = this.core.queryModel('vpnGateways');
        var cgws = this.core.queryModel('customerGateways');
        var values = this.core.promptInput("Create VPN Connection", [{label:"Type",value:"ipsec.1",required:1},
                                                                     {label:"Customer Gateway",type:"menulist",list:cgws,value:cgwid,required:1},
                                                                     {label:"VPN Gateway",type:"menulist",list:vgws,value:vgwid,required:1},
                                                                     {label: "Static Routes Only",type:"checkbox",oncommand:"rc.items[4].required=rc.items[3].obj.checked"},
                                                                     {label: "IP prefixes on your side of VPN connection"},
                                                                     {label:"",type:"label",value:"Comma separated, e.g.:10.0.0.0/16,10.1.1.0/16"}]);
        if (!values) return;
        this.core.api.createVpnConnection(values[0], values[1], values[2], values[3], function(id) {
            if (values[3]) {
                var routes = values[4].split(",");
                for (var i = 0; i < routes.length; i++) {
                    this.core.api.createVpnConnectionRoute(id, routes[i], function(id) { if (i == routes.length -1) me.refresh(); });
                }
            } else {
                me.refresh();
            }
        });
    },

    deleteVpnConnection : function () {
        var vpn = this.getSelected();
        if (vpn == null) return;

        var confirmed = confirm("Delete " + vpn.toString() + "?");
        if (!confirmed) return;

        var me = this;
        this.core.api.deleteVpnConnection(vpn.id, function() { me.refresh(); });
    },

    addRoute: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item) return;
        var cidr = this.core.prompt("Please provide static route between VPN gateway and Customer gateway:");
        if (!cidr) return;
        this.core.api.createVpnConnectionRoute(item.id, cidr, function() { me.refresh(); });
    },

    deleteRoute: function()
    {
        var me = this;
        var item = this.getSelected();
        if (!item || !item.routes || !item.routes.length) {
            return alert('No route to delete');
        }
        var idx = 0;

        if (item.routes.length > 0) {
            idx = this.core.promptList("Routes", "Select route to delete", item.routes);
            if (idx < 0) return;
        } else {
            if (!confirm('Delete route ' + item.routes[idx] + '?')) return;
        }
        this.core.api.deleteVpnConnectionRoute(item.id, item.routes[idx].destinationCidrBlock, function() { me.refresh(); });
    },

};


var ew_CustomerGatewayTreeView = {
    model: 'customerGateways',
    searchElement: 'ew.customergateways.search',

    menuChanged : function() {
        var image = this.getSelected();
        $("ew.customergateways.contextmenu").disabled = (image == null);
        TreeView.menuChanged.call(this);
    },

    createCustomerGateway : function () {
        var me = this;
        var values = this.core.promptInput("Create Customer Gateway", [{label:"Type",value:"ipsec.1",required:1},
                                                                       {label:"IP Address",type:"ip",required:1},
                                                                       {label:'BGP ASN',type:"number",value:65000} ]);
        if (!values) return;
        this.core.api.createCustomerGateway(values[0], values[1], values[2], function(id) { me.refresh(); });
    },

    deleteCustomerGateway : function () {
        var cgw = this.getSelected();
        if (cgw == null) return;

        var confirmed = confirm("Delete " + cgw.toString() + "?");
        if (!confirmed) return;

        var me = this;
        this.core.api.deleteCustomerGateway(cgw.id, function(id) { me.refresh(); });
    },

    createVpnConnection : function() {
        var cgw = this.getSelected();
        if (cgw == null) return;

        ew_VpnConnectionTreeView.createVpnConnection(cgw.id, null);
        this.core.selectTab('ew.tabs.vpn');
    },
};


var ew_VpnGatewayTreeView = {
    model: ['vpnGateways', 'vpcs', 'routeTables', 'availabilityZones'],

    menuChanged : function() {
        var image = this.getSelected();
        $("ew.vpnGateways.contextmenu").disabled = (image == null);
        TreeView.menuChanged.call(this);
    },

    createVpnGateway : function () {
        var values = this.core.promptInput('Create VPN Gateway', [{label:"Type",value:"ipsec.1"}]);
        if (!values) return;
        var me = this;
        this.core.api.createVpnGateway(values[0], function() { me.refresh(); });
    },

    deleteVpnGateway : function () {
        var vgw = this.getSelected();
        if (vgw == null) return;

        var confirmed = confirm("Delete " + vgw.toString() + "?");
        if (!confirmed) return;

        var me = this;
        this.core.api.deleteVpnGateway(vgw.id, function() { me.refresh(); });
    },

    createVpnConnection : function() {
        var vgw = this.getSelected();
        if (vgw == null) return;

        ew_VpnConnectionTreeView.createVpnConnection(null, vgw.id);
    },

    enablePropagation: function() {
        var vgw = this.getSelected();
        if (vgw == null) return;

        var routes = this.core.queryModel('routeTables');
        var idx = this.core.promptList("Enable Propagation to route table", "Select route table:", routes);
        if (idx >= 0) {
            this.core.api.enableVgwRoutePropagation(vgw.id, routes[idx].id, function() {});
        }
    },

    detachVpc : function()
    {
        var vgw = this.getSelected();
        if (!vgw || !vgw.vpcId) return;

        var confirmed = confirm("Detach VPC " + vgw.vpcId + "?");
        if (!confirmed) return;

        var me = this;
        this.core.api.detachVpnGatewayFromVpc(vgw.id, vgw.vpcId, function() { me.refresh(); });
    },

    attachVpc : function(vpcid, vgwid)
    {
        var me = this;
        var vgw = this.getSelected();
        if (!vgw) return;
        var vpcs = this.core.queryModel('vpcs');

        var values = this.core.promptInput("Attach VPN Gateway", [{label:"VPN Gateway",type:"label",value:vgw.id,required:1},
                                                                  {label:"VPC",type:"menulist",list:vpcs,value:vpcid,required:1},]);
        if (!values) return;
        this.core.api.attachVpnGatewayToVpc(values[0], values[1], function() { me.refresh(); });
    },
};

