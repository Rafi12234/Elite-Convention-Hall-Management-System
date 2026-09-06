$u = App\Models\User::find(18);
$t = Illuminate\Support\Str::random(80);
$u->api_token_hash = hash('sha256', $t);
$u->save();
echo $t;
