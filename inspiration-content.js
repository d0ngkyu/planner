// Stable IDs: saved copies keep their text even if the bundled collection changes.
import { EXTRA_PIECES } from './inspiration-extra.js';
// Original writing is explicitly labelled; no modern essay/poem excerpts are bundled.
export const MOODS = {
  encourage: {name:'응원',color:'#3b6e5c',subs:{restart:'다시 시작',courage:'작은 용기'}},
  growth: {name:'성장',color:'#3b6fd8',subs:{habits:'꾸준함',learning:'배움'}},
  rest: {name:'쉼',color:'#8477a8',subs:{pause:'잠깐 쉬기',kindness:'나에게 다정하게'}},
  focus: {name:'집중',color:'#a57832',subs:{simple:'덜어내기',present:'지금 한 가지'}},
  connection: {name:'관계',color:'#b56b58',subs:{together:'함께하기',gratitude:'고마운 순간'}},
  wonder: {name:'발견',color:'#397e9a',subs:{curiosity:'호기심',joy:'작은 즐거움'}},
};
const originals = [
 ['encourage','restart',[
  '다시 시작하는 날에는 어제의 속도를 가져오지 않아도 괜찮아요.',
  '접어 둔 페이지는 사라지지 않는다. 오늘 책을 펼치면, 이야기는 그 자리에서 다시 이어진다.',
  '오늘 다시 시작한다면, 가장 작게 할 수 있는 일은 무엇인가요?',
  '미뤄 둔 일 하나를 골라 첫 동작만 해보세요. 파일 열기나 신발 꺼내기도 시작이에요.',
  '빈칸은 실패의 자국이 아니라, 다음 이야기가 앉을 자리.']],
 ['encourage','courage',[
  '잘할 자신이 없어도, 한 번 해볼 마음은 가질 수 있어요.',
  '용기는 두려움이 사라진 뒤에만 오는 것이 아니다. 조금 떨리는 손으로도 문고리는 돌릴 수 있다.',
  '결과를 잠시 잊는다면, 해보고 싶은 일은 무엇인가요?',
  '망설이던 일의 연습판을 만들어보세요. 누구에게도 보여주지 않을 초안이면 충분해요.',
  '작은 발걸음이 문 앞에 섰다. 문은 그제야 길의 일부가 되었다.']],
 ['growth','habits',[
  '오늘의 작은 반복이 내일의 나에게 익숙한 길을 만들어줘요.',
  '습관은 날마다 열리는 작은 가게와 닮았다. 대단한 일을 못한 날에도 문을 열었다는 사실이 남는다.',
  '바쁜 날에도 이어갈 수 있는, 나만의 최소 단위는 무엇인가요?',
  '하고 싶은 습관을 2분짜리로 줄여 적어보세요. 오늘은 그만큼만 해도 됩니다.',
  '돌 위의 작은 물방울. 서두르지 않아도 흔적은 쌓인다.']],
 ['growth','learning',[
  '모른다는 걸 알아차린 순간부터 배움은 이미 시작됐어요.',
  '처음 읽을 때 보이지 않던 문장이 두 번째에는 눈에 들어온다. 책이 변한 것이 아니라 내가 한 번 더 다녀온 것이다.',
  '오늘 새로 알게 된 것 하나를, 내 말로 설명할 수 있나요?',
  '읽거나 배운 내용에서 한 문장만 골라 내 말로 다시 적어보세요.',
  '물음표 하나가 머무른 자리에서, 생각의 가지가 뻗는다.']],
 ['rest','pause',[
  '잠시 멈추는 시간도 하루 안에 자리를 가져도 돼요.',
  '컵을 내려놓아야 손이 쉰다. 생각도 가끔은 어디엔가 내려놓고, 잠깐 창밖을 보아도 좋겠다.',
  '지금 내 몸이 원하는 작은 쉼은 어떤 모습인가요?',
  '화면에서 잠깐 눈을 떼고 먼 곳을 바라보세요. 다음 일은 그 뒤에 골라도 괜찮아요.',
  '바람이 쉬어 가는 가지처럼, 잠깐은 아무것도 붙잡지 않기.']],
 ['rest','kindness',[
  '오늘의 나를 어제의 계획표만으로 평가하지 않아도 괜찮아요.',
  '계획은 그날의 나를 돕기 위해 적었다. 그날의 내가 지쳤다면, 계획을 조금 고치는 것도 계획의 역할이다.',
  '친한 친구가 오늘의 나처럼 지냈다면 어떤 말을 건네고 싶나요?',
  '오늘 해낸 일을 하나 적어보세요. 작아서 목록에 없었던 일도 포함해서요.',
  '내 마음의 문을 두드릴 때에는, 조금 부드러운 손으로.']],
 ['focus','simple',[
  '덜 하는 선택이 중요한 일을 위한 자리를 만들기도 해요.',
  '책상 위를 전부 비울 필요는 없다. 지금 펼칠 종이 한 장이 놓일 만큼이면, 시작할 자리는 생긴다.',
  '오늘 하지 않아도 되는 일을 하나 고른다면 무엇인가요?',
  '할 일 목록에서 가장 중요한 하나에 표시하고, 나머지는 잠시 접어두세요.',
  '여백은 비어 있는 곳이 아니라, 중요한 것이 숨 쉬는 곳.']],
 ['focus','present',[
  '다음 열 가지보다, 지금 손에 잡히는 한 가지부터.',
  '먼 길을 한 번에 걸을 수는 없다. 그러나 지금 발밑의 한 걸음에는 온전히 마음을 놓을 수 있다.',
  '지금 10분을 어디에 쓰면, 조금 후의 내가 편해질까요?',
  '타이머를 짧게 맞추고 한 가지 일만 시작해보세요. 끝나면 계속할지 다시 고르면 돼요.',
  '오늘이라는 넓은 들판에서, 지금의 작은 풀 한 포기 만나기.']],
 ['connection','together',[
  '혼자 다 해내지 않아도, 내가 해낸 부분의 가치는 줄지 않아요.',
  '같이 걷는다는 것은 늘 같은 속도로 걷는 일이 아니다. 때로는 한 사람이 신발 끈을 묶는 동안 옆에 서 있는 일이다.',
  '도움을 조금 청해도 괜찮을 사람은 누구인가요?',
  '고마웠던 사람에게 짧은 안부를 건네보세요. 완벽한 문장이 아니어도 좋아요.',
  '나란히 놓인 두 개의 컵. 말이 적어도 자리는 따뜻하다.']],
 ['connection','gratitude',[
  '좋았던 순간은 크기보다, 알아봐 주는 마음을 기다릴 때가 있어요.',
  '하루가 온통 좋을 필요는 없다. 그중 한 장면이 다정했다면, 그 장면만큼은 따로 접어 간직할 수 있다.',
  '오늘 다시 떠올리고 싶은 작은 장면은 무엇인가요?',
  '오늘 고마웠던 일 하나를 구체적으로 적어보세요. 날씨나 따뜻한 한 끼도 좋아요.',
  '흘러가는 하루의 주머니에, 반짝이는 순간 하나 넣어두기.']],
 ['wonder','curiosity',[
  '익숙한 하루에도 처음 던지는 질문 하나는 들어갈 수 있어요.',
  '늘 지나던 길에서 처음 보는 잎을 발견했다. 새로움은 멀리 있는 것이 아니라, 아직 천천히 보지 않은 곳에도 있었다.',
  '요즘 이유 없이 궁금해지는 것은 무엇인가요?',
  '관심 있는 주제에서 모르는 단어 하나를 찾아보세요. 오늘의 작은 탐험으로요.',
  '낯선 문장 앞에서 잠깐 멈췄다. 세상이 한 칸 넓어졌다.']],
 ['wonder','joy',[
  '할 일 사이에도 좋아하는 것을 위한 작은 칸을 남겨두세요.',
  '계획표가 조금 무거워 보일 때는 즐거운 약속을 하나 적는다. 미래의 나에게 남기는 작은 선물처럼.',
  '아무 쓸모가 없어도 즐거워서 하고 싶은 일은 무엇인가요?',
  '좋아하는 노래 한 곡이나 짧은 산책을 오늘 일정에 넣어보세요.',
  '오늘의 할 일: 한 번 웃기. 준비물: 꼭 대단할 필요 없는 이유.']],
];
const kinds=['응원','짧은 에세이','생각 질문','작은 실천','짧은 글'];
export const PIECES=originals.flatMap(([mood,sub,texts])=>texts.map((text,i)=>({id:`o-${sub}-${i+1}`,mood,sub,text,kind:kinds[i],author:'플래너 창작',source:'앱을 위해 직접 쓴 글',url:''})));
const sayings=[
 ['restart','시작이 반이다.'],['courage','천 리 길도 한 걸음부터.'],['habits','티끌 모아 태산.'],['together','백지장도 맞들면 낫다.'],['together','가는 말이 고와야 오는 말이 곱다.'],['simple','돌다리도 두들겨 보고 건너라.'],['learning','구슬이 서 말이라도 꿰어야 보배.'],['present','우물을 파도 한 우물을 파라.'],['habits','세 살 버릇 여든까지 간다.'],['habits','공든 탑이 무너지랴.'],
];
for(const [sub,texts] of Object.entries(EXTRA_PIECES)) {
  const mood=Object.keys(MOODS).find(k=>sub in MOODS[k].subs);
  texts.forEach((text,i)=>PIECES.push({id:`e-${sub}-${i+1}`,mood,sub,text,kind:text.endsWith('?')?'생각 질문':text.includes('보세요')?'작은 실천':text.length>65?'짧은 에세이':'짧은 글',author:'플래너 창작',source:'앱을 위해 직접 쓴 글',url:''}));
}
for(const [i,[sub,text]] of sayings.entries()) PIECES.push({id:`p-${i+1}`,mood:Object.keys(MOODS).find(k=>sub in MOODS[k].subs),sub,text,kind:'속담',author:'전래 속담',source:'한국어 속담',url:''});
PIECES.push(
 {id:'classic-ep-1',mood:'focus',sub:'simple',text:'우리에게 달린 일도 있고, 우리에게 달려 있지 않은 일도 있다.',kind:'고전의 한 문장',author:'에픽테토스',source:'『엥케이리디온』 1절 · 자체 의역 (Elizabeth Carter 영문본 참고)',url:'https://classics.mit.edu/Epictetus/epicench.html'},
 {id:'classic-ep-46',mood:'growth',sub:'habits',text:'철학의 원칙을 길게 말하기보다, 그 원칙에 따라 행동하라.',kind:'고전의 한 문장',author:'에픽테토스',source:'『엥케이리디온』 46절 · 자체 의역 (Elizabeth Carter 영문본 참고)',url:'https://classics.mit.edu/Epictetus/epicench.html'},
);
