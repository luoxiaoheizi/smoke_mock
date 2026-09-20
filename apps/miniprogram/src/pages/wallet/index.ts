import { getTimeContext, type LedgerEntry } from '../../../../../packages/domain/src/index';
import { api } from '../../services/api';
import { formatDate, toastError } from '../../services/preferences';
type Row = LedgerEntry & { date: string; amountLabel: string };
Page({
 data:{coins:0,claimed:false,loading:true,busy:false,loadingMore:false,error:'',rows:[] as Row[],total:0},
 onLoad(){void this.refresh();},
 async refresh(){this.setData({loading:true,error:''});try{const [boot,list]=await Promise.all([api.bootstrap(),api.ledger()]);this.setData({coins:boot.player.coins,claimed:boot.player.lastClaimDay===getTimeContext(new Date(boot.serverTime)).day,rows:this.mapRows(list.items),total:list.total});}catch(e){this.setData({error:e instanceof Error?e.message:'加载失败'});}finally{this.setData({loading:false});}},
 mapRows(items:LedgerEntry[]):Row[]{return items.map(item=>({...item,date:formatDate(item.createdAt),amountLabel:(item.amount>0?'+':'')+item.amount}));},
 async claim(){if(this.data.busy||this.data.claimed)return;this.setData({busy:true});try{await api.claim();await this.refresh();wx.showToast({title:'补给已经收好',icon:'success'});}catch(e){toastError(e);}finally{this.setData({busy:false});}},
 async more(){if(this.data.loadingMore||this.data.rows.length>=this.data.total)return;this.setData({loadingMore:true});try{const list=await api.ledger(this.data.rows.length);this.setData({rows:[...this.data.rows,...this.mapRows(list.items)],total:list.total});}catch(e){toastError(e);}finally{this.setData({loadingMore:false});}},
 onReachBottom(){void this.more();},
});

