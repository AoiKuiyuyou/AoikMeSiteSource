--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: '亿级流量系统架构'

author: Repost

create_time: 2018-12-01 20:00:00

tags:
    - architecture

post_id: 7

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# 亿级流量系统架构
\
[《亿级流量系统架构之如何支撑百亿级数据的存储与计算【石杉的架构笔记】》](https://mp.weixin.qq.com/s?__biz=MzU0OTk3ODQ3Ng==&mid=2247483948&idx=1&sn=e75aa8b5cfae1363391801e2f74bd2ee&chksm=fba6ea2fccd163390520dbc62b6170c7f3d456207e623fce4ded036fea525a6782a31098b905&mpshare=1&scene=1&srcid=1201rgBr1VUk1Zs9bYjikUeP#rd)

[《亿级流量系统架构之如何设计高容错分布式计算系统【石杉的架构笔记】》](https://mp.weixin.qq.com/s?__biz=MzU0OTk3ODQ3Ng==&mid=2247483966&idx=1&sn=6547135bd79c33a889ff71d05aad1fd7&chksm=fba6ea3dccd1632bad88202d4031b98412ceccde3ec39242878be67bae4e3109e066bd7b1604&mpshare=1&scene=1&srcid=1201KlxOUuLUYBTFgEtp8FmF#rd)

[《亿级流量系统架构之如何设计承载百亿流量的高性能架构【石杉的架构笔记】》](https://mp.weixin.qq.com/s?__biz=MzU0OTk3ODQ3Ng==&mid=2247483975&idx=1&sn=90a7cb608bc42df99bbad4104397ac88&chksm=fba6ea44ccd16352a7ff04f27290b84afe842d4baaa60c43596e4ca975e4ad4e27eaaa71eb0e&mpshare=1&scene=1&srcid=1201sFSY0FP6k9v73K7yAfnN#rd)

[《亿级流量系统架构之如何设计每秒十万查询的高并发架构【石杉的架构笔记】》](https://mp.weixin.qq.com/s?__biz=MzU0OTk3ODQ3Ng==&mid=2247483986&idx=1&sn=a6c313fa97aaac0556716834905ff20f&chksm=fba6ea51ccd16347cb055efe7046e6ed42e73a284275df41d2e587c5ea6d24ecc3cbf569b8d8&mpshare=1&scene=1&srcid=12018MxDTP97AAo5ZmZCiFZA#rd)

[《亿级流量系统架构之如何设计全链路99.99%高可用架构【石杉的架构笔记】》](https://mp.weixin.qq.com/s?__biz=MzU0OTk3ODQ3Ng==&mid=2247483996&idx=1&sn=698f5a2b07be1d29ec68532588b8df9e&chksm=fba6ea5fccd16349b139a25a9fe04ba59d81777cb5f7097ee95110c6c38ec2d1cd90a8a6c560&mpshare=1&scene=1&srcid=1201MoyteODQDctxSQrtXA36#rd)
