import subprocess,json,time,pathlib,sys
R=pathlib.Path(__file__).resolve().parents[1]
prompts={
'01_research':'''온라인 설문 도구 Tally, Typeform, Google Forms를 처음 쓰려는 사람을 위해 공식 도움말을 비교해줘. read_service 도구로 세 페이지를 모두 조회해. 서로 독립적인 조회를 Code Mode의 Promise.allSettled로 묶고, 각 응답에서 읽을 근거 텍스트와 source를 출력해. 자료를 실제로 읽고 시작 안내, 응답 결과 관리 안내를 찾을 수 있는지 간결한 표로 정리해. 이 페이지에서 확인하지 못한 기능이나 가격은 미확인으로 써. 모든 행에 출처 링크를 붙여. 조회 실패도 숨기지 마.''',
'02_reviews':'''강의용 합성 리뷰 6월, 7월, 8월 파일을 read_reviews로 읽어줘. Code Mode 안에서 세 조회를 묶고 JSON을 파싱해. id로 중복 제거 후 월별 고유 리뷰 수와 평점별 개수, 낮은 평점(1~2점) 리뷰 수를 계산해. topic_hint는 합성 데이터의 정답 라벨이므로 의미 분류 능력으로 소개하지 말고 검증용 집계에만 사용해. 전체 원문을 출력하지 말고 총 입력 행 수, 고유 수, 중복 수, 월별 집계, 낮은 평점 주제별 개수와 대표 원문 한 개 및 id만 출력해. 한국어로 짧게 설명해.''',
'03_weekly':'''기준일 2026-09-13. read_tasks와 read_minutes를 Code Mode에서 함께 조회해. 이 데이터는 강의용 합성 자료야. task_id와 id가 정확히 같은 행만 연결해. 완료, 진행 중이면서 기한이 지난 일, 담당자 미정, 기한 미정, 회의록에만 있는 일을 구분한 주간 보고서 초안을 만들어. 업무명 유사도로 임의 매칭하거나 없는 담당자/날짜를 만들지 마. Code Mode에서 분류한 구조화 결과를 출력하고 최종 답변은 한국어로 표와 핵심 설명만 써. 외부 전송은 하지 마.''',
'04_github':'''공개 astral-sh/ruff 저장소의 열린 PR 5개를 list_pull_requests로 조회하고, 그 번호들로 read_pull_request를 호출해. Code Mode에서 독립적인 상세 조회는 Promise.allSettled로 묶어. 초안 여부, 변경 파일 수, 리뷰 기록 유무, 링크를 표로 정리해. 리뷰 기록이 있다는 사실을 현재 승인 완료로 해석하지 마. 이 실습 도구는 CI 데이터를 반환하지 않으니 검사 상태를 지어내지 말고 미조회로 표시해. 개별 조회 실패는 PR 상태와 구분해. 한국어로 간결하게 답해.'''
}
common='''\n이것은 Code Mode 강의의 실제 실행이다. 반드시 functions.exec의 JavaScript에서 제공된 mcp lesson 도구를 호출하라. tools.*의 실제 제공 이름과 입력 스키마만 사용한다. MCP CallToolResult.content의 text 블록 JSON을 파싱하라. 원본 도구 결과 구조를 확신하지 못하면 먼저 최소 정보를 확인한다. shell, exec_command, 파일 읽기, 외부 검색, subagents는 사용하지 않는다. 최종 답변에는 확인한 결과만 쓴다. 결과를 저장했다고 주장하지 않는다.'''
(R/'course/prompts').mkdir(exist_ok=True)
for k,p in list(prompts.items()):
 f=R/f'course/prompts/{k}.txt'
 if f.exists():prompts[k]=f.read_text()
 else:f.write_text(p)
selected=sys.argv[1:] or list(prompts)
for key in selected:
 start=time.time();print('RUN',key,flush=True)
 args=['codex','exec','--ignore-user-config','--skip-git-repo-check','--enable','code_mode','--enable','code_mode_only','-C',str(R),'-s','read-only','--json','-c','mcp_servers.lesson.command="python3"','-c','mcp_servers.lesson.args='+json.dumps([str(R/'course/lesson_tools.py')]),'-c','mcp_servers.lesson.tool_timeout_sec=60','-o',str(R/f'assets/{key}.md'),prompts[key]+common]
 with (R/f'qa/{key}.jsonl').open('w') as out,(R/f'qa/{key}.stderr').open('w') as err:
  result=subprocess.run(args,stdin=subprocess.DEVNULL,stdout=out,stderr=err,timeout=360)
 events=[json.loads(l) for l in (R/f'qa/{key}.jsonl').read_text().splitlines()]
 tid=next((e['thread_id'] for e in events if 'thread_id' in e),None)
 calls=[]
 if tid:
  for f in (pathlib.Path.home()/'.codex/sessions').rglob('*'+tid+'*'):
   for l in f.read_text().splitlines():
    o=json.loads(l);v=o.get('payload',{})
    if v.get('type')=='custom_tool_call' and v.get('name') in ['exec','functions.exec']:calls.append({'type':'code','code':v.get('input'),'call_id':v.get('call_id')})
    elif v.get('type') in ['function_call_output','custom_tool_call_output']:
     val=v.get('output');calls.append({'type':'output','output':val,'call_id':v.get('call_id')})
 report={'id':key,'prompt':prompts[key],'duration':round(time.time()-start,2),'exit_code':result.returncode,'code_mode_calls':sum(c['type']=='code' for c in calls),'events':calls,'usage':next((e.get('usage') for e in events if e['type']=='turn.completed'),{}),'answer':(R/f'assets/{key}.md').read_text() if (R/f'assets/{key}.md').exists() else ''}
 (R/f'assets/{key}.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print('DONE',key,'code_mode_calls',report['code_mode_calls'],'seconds',report['duration'],flush=True)
