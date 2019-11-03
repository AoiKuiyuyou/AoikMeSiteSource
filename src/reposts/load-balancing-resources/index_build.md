--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: Load balancing resources

author: Repost

create_time: 2018-12-08 20:00:00

tags:
    - load-balancing

post_id: 8

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Load balancing resources

## General
[What are the best load balancing methods and algorithms?](https://www.loadbalancer.org/blog/load-balancing-methods/)

[Making applications scalable with Load Balancing](http://wtarreau.blogspot.com/2006/11/making-applications-scalable-with-load.html)

## LVS
[How virtual server works?](http://www.linuxvirtualserver.org/how.html)

[LVS在大规模网络环境中的应用](http://www.jiagoumi.com/technical-article/1592.html)

## BGP-OSPF-ECMP
[Load Balancing With DNS, BGP and LVS](http://blog.raymond.burkholder.net/index.php?/archives/632-Load-Balancing-With-BGP-and-LVS.html)

[Day 11 - Turning off the Pacemaker: Load Balancing Across Layer 3](http://sysadvent.blogspot.com/2014/12/day-11-turning-off-pacemaker-load.html)

[Stop Buying Load Balancers and Start Controlling Your Traffic Flow with Software](https://www.tuicool.com/articles/yyQFRr2)

[LVS-ospf集群](http://noops.me/?p=974)

## Anycast
[Load Balancing without Load Balancers](https://blog.cloudflare.com/cloudflares-architecture-eliminating-single-p/)

## Google
[Google 是如何做负载均衡的？](http://oilbeater.com/%E5%8D%9A%E5%AE%A2/2016/11/21/google-loadbalancert.html)

## Facebook
[Building A Billion User Load Balancer](https://www.usenix.org/conference/srecon15europe/program/presentation/shuff)

## Github
[Introducing the GitHub Load Balancer](https://githubengineering.com/introducing-glb/)

## UCloud
[从Google Maglev说起，如何造一个牛逼的负载均衡？](https://zhuanlan.zhihu.com/p/22360384)
