import { PRODUCTS, SCENES, type Session } from '../../../../../packages/domain/src/index';
import { api } from '../../services/api';
import { formatDate, toastError } from '../../services/preferences';
type Row=Session & { date:string;place:string;product:string };
Page({
 data:{rows:[] as Row[],loading:true,loadingMore:false,error:'',total:0},
 onLoad(){void this.refresh();},
 mapRows(items:Session[]):Row[]{return items.map(s=>({...s,date:formatDate(s.startedAt),place:SCENES.find(x=>x.id===s.sceneId)?.name??s.sceneId,product:PRODUCTS.find(x=>x.id===s.productId)?.name??s.productId}));},
 async refresh(){this.setData({loading:true,error:''});try{const result=await api.history();this.setData({rows:this.mapRows(result.items),total:result.total});}catch(e){this.setData({error:e instanceof Error?e.message:'加载失败'});}finally{this.setData({loading:false});}},
 async more(){if(this.data.loadingMore||this.data.rows.length>=this.data.total)return;this.setData({loadingMore:true});try{const r=await api.history(this.data.rows.length);this.setData({rows:[...this.data.rows,...this.mapRows(r.items)],total:r.total});}catch(e){toastError(e);}finally{this.setData({loadingMore:false});}},
 onReachBottom(){void this.more();},
 goExperience(){wx.switchTab({url:'/pages/experience/index'});}
});

