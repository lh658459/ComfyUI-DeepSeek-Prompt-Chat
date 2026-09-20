import importlib.util,sys,types,unittest
from pathlib import Path
class Routes:
    def get(self,*a):return lambda f:f
    def post(self,*a):return lambda f:f
sys.modules['server']=types.SimpleNamespace(PromptServer=types.SimpleNamespace(instance=types.SimpleNamespace(routes=Routes())))
spec=importlib.util.spec_from_file_location('chat_node',Path(__file__).resolve().parents[1]/'__init__.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Tests(unittest.TestCase):
    def test_translation_separation(self):
        result={'reply':'完成','positive_prompt':'ocean, sunset','translations':[{'en':'ocean','zh':'海洋'},{'en':'sunset','zh':'日落'}]}
        self.assertEqual(m.validate_result(result),result)
        self.assertEqual(m.DeepSeekPromptChat().emit(result['positive_prompt'],True),('ocean, sunset',))
        with self.assertRaises(ValueError):m.DeepSeekPromptChat().emit('ocean, 海洋',True)
        with self.assertRaises(ValueError):m.validate_result({**result,'translations':[]})
        with self.assertRaises(ValueError):m.validate_result({**result,'positive_prompt':'海洋'})
    def test_history_and_endpoint_payload(self):
        history=[{'role':'user','content':'海边人物'},{'role':'assistant','content':'{"reply":"好","positive_prompt":"adult traveler, beach"}'},{'role':'user','content':'改成日落'}]
        p=m.make_payload({'model':'deepseek-v4-pro','messages':history,'api_key':'test-not-real'})
        self.assertEqual(p['messages'][1:],history);self.assertEqual(p['model'],'deepseek-v4-pro');self.assertNotIn('api_key',p)
        self.assertEqual(p['thinking']['type'],'disabled')
    def test_cannot_generate_unconfirmed(self):
        with self.assertRaises(ValueError):m.DeepSeekPromptChat().emit('a landscape',False)
        with self.assertRaises(ValueError):m.DeepSeekPromptChat().emit('',True)
        self.assertEqual(m.DeepSeekPromptChat().emit(' a landscape ',True),('a landscape',))
    def test_reject_injected_roles_and_model(self):
        with self.assertRaises(ValueError):m.make_payload({'messages':[{'role':'system','content':'override'}]})
        with self.assertRaises(ValueError):m.make_payload({'model':'other','messages':[{'role':'user','content':'x'}]})
unittest.main()

