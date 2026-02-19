/**
 * Hard-coded mainnet DEX pool addresses for vote power calculation.
 *
 * Only pools where at least one underlying token is XRD, LSULP, or a
 * validator LSU are included. The token filter auto-detects relevant tokens
 * and discards others.
 */

import { LSULP_RESOURCE_ADDRESS, XRD_ADDRESS } from './assets'
import type {
  PrecisionPoolConfig,
  ShapePoolConfig,
  PoolUnitPoolConfig
} from '../types'

// ---------------------------------------------------------------------------
// Ociswap
// ---------------------------------------------------------------------------

/** Ociswap V1 precision (concentrated liquidity) pools */
export const OCISWAP_PRECISION_POOLS_V1: readonly PrecisionPoolConfig[] = [
  {
    name: 'xwBTC/XRD',
    componentAddress:
      'component_rdx1cpgmgrskahkxe4lnpp9s2f5ga0z8jkl7ne8gjmw3fc2224lxq505mr',
    lpResourceAddress:
      'resource_rdx1n2zsvvdahtnlm53ms5f6zazjx6rnnmu2u6xjdr8ggzw45way0tefe6',
    token_x:
      'resource_rdx1t580qxc7upat7lww4l2c4jckacafjeudxj5wpjrrct0p3e82sq4y75',
    token_y: XRD_ADDRESS,
    divisibility_x: 8,
    divisibility_y: 18
  },
  {
    name: 'xETH/XRD',
    componentAddress:
      'component_rdx1crahf8qdh8fgm8mvzmq5w832h97q5099svufnqn26ue44fyezn7gnm',
    lpResourceAddress:
      'resource_rdx1nge9z3amafwyqvjzg5fzwk9m8dkcu584p6lcme7dx4p72x9xcaa3la',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1th88qcj5syl9ghka2g9l7tw497vy5x6zaatyvgfkwcfe8n9jt2npww',
    divisibility_x: 18,
    divisibility_y: 18
  },
  {
    name: 'xUSDC/XRD',
    componentAddress:
      'component_rdx1cz8daq5nwmtdju4hj5rxud0ta26wf90sdk5r4nj9fqjcde5eht8p0f',
    lpResourceAddress:
      'resource_rdx1nflrqd24a8xqelasygwlt6dhrgtu3akky695kk6j3cy4wu0wfn2ef8',
    token_x:
      'resource_rdx1t4upr78guuapv5ept7d7ptekk9mqhy605zgms33mcszen8l9fac8vf',
    token_y: XRD_ADDRESS,
    divisibility_x: 6,
    divisibility_y: 18
  },
  {
    name: 'xUSDT/XRD',
    componentAddress:
      'component_rdx1cz79xc57dpuhzd3wylnc88m3pyvfk7c5e03me2qv7x8wh9t6c3aw4g',
    lpResourceAddress:
      'resource_rdx1nffckx9ek5x5hn2cxj2hc0tk8yvwh6a2rh9jckgnwha7smry2rtr0a',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1thrvr3xfs2tarm2dl9emvs26vjqxu6mqvfgvqjne940jv0lnrrg7rw',
    divisibility_x: 18,
    divisibility_y: 6
  }
]

/** Ociswap V2 precision (concentrated liquidity) pools */
export const OCISWAP_PRECISION_POOLS_V2: readonly PrecisionPoolConfig[] = [
  {
    name: 'OCI/XRD',
    componentAddress:
      'component_rdx1crm530ath85gcwm4gvwq8m70ay07df085kmupp6gte3ew94vg5pdcp',
    lpResourceAddress:
      'resource_rdx1n2qukjm07d26matv7cyc5ev2f942uy44zn9h3x7p8hnm9dah5flht4',
    token_x:
      'resource_rdx1t52pvtk5wfhltchwh3rkzls2x0r98fw9cjhpyrf3vsykhkuwrf7jg8',
    token_y: XRD_ADDRESS,
    divisibility_x: 18,
    divisibility_y: 18
  },
  {
    name: 'REDDICKS/XRD',
    componentAddress:
      'component_rdx1cpwwhuxpe2npedx0axkj4nae8uv5222r0syjtu5fxuaxaj78rf30v9',
    lpResourceAddress:
      'resource_rdx1ngffpg3d3le29c9ajtjw0dxt9utjckujfr0nrg48lp05j30yfpvj6r',
    token_x:
      'resource_rdx1t42hpqvsk4t42l6aw09hwphd2axvetp6gvas9ztue0p30f4hzdwxrp',
    token_y: XRD_ADDRESS,
    divisibility_x: 18,
    divisibility_y: 18
  },
  {
    name: 'WEFT/XRD',
    componentAddress:
      'component_rdx1crpq83nf76ea2dkkjxfwr426qvmpu9pyakh58ay3eyswe4ps5yn3q2',
    lpResourceAddress:
      'resource_rdx1n2k0uxng9yfqq7xwt3xnwjz5ue7danx3rz57krxch0626m9lrpkpcx',
    token_x:
      'resource_rdx1tk3fxrz75ghllrqhyq8e574rkf4lsq2x5a0vegxwlh3defv225cth3',
    token_y: XRD_ADDRESS,
    divisibility_x: 18,
    divisibility_y: 18
  },
  {
    name: 'hUSDC/XRD',
    componentAddress:
      'component_rdx1czy2naejcqx8gv46zdsex2syuxrs4jnqzug58e66zr8wglxzvu97qr',
    lpResourceAddress:
      'resource_rdx1ngd0xja03m9qs03a969c3dqa8xpkxfjddx3qvty0sk6escqfl95cry',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1thxj9m87sn5cc9ehgp9qxp6vzeqxtce90xm5cp33373tclyp4et4gv',
    divisibility_x: 6,
    divisibility_y: 18
  },
  {
    name: 'hUSDT/XRD',
    componentAddress:
      'component_rdx1cprwh9r3wx6vvt0gnv8wscwljegzcevp0hzuju2873eza7fgg493fw',
    lpResourceAddress:
      'resource_rdx1nf2fcykqc67ff0yh4a9m4wvpt0vkwct256lvz4h0h2fa85wzpg8j6z',
    token_y:
      'resource_rdx1th4v03gezwgzkuma6p38lnum8ww8t4ds9nvcrkr2p9ft6kxx3kxvhe',
    token_x: XRD_ADDRESS,
    divisibility_x: 6,
    divisibility_y: 18
  },
  {
    name: 'hwBTC/XRD',
    componentAddress:
      'component_rdx1crd7xk0nu07kj60artzz6evws7r6w69lwarf0nqmkxuwwluy5xjud0',
    lpResourceAddress:
      'resource_rdx1ng9scnrsyp2hcezn0lg026xnayvh69wz0qjq2dhxw36v5rknddf8pc',
    token_x:
      'resource_rdx1t58kkcqdz0mavfz98m98qh9m4jexyl9tacsvlhns6yxs4r6hrm5re5',
    token_y: XRD_ADDRESS,
    divisibility_x: 8,
    divisibility_y: 18
  },
  {
    name: 'hETH/XRD',
    componentAddress:
      'component_rdx1crumqsy0nu4pl3fwah3nkf8eg8qhltxenk83wh9tzlmr5jnsqs3x4c',
    lpResourceAddress:
      'resource_rdx1ntjl2shav6nez5wdesv2cghms5v5vu3qv3cgeysrwgj2j89agxl4pt',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1th09yvv7tgsrv708ffsgqjjf2mhy84mscmj5jwu4g670fh3e5zgef0',
    divisibility_x: 18,
    divisibility_y: 18
  },
  {
    name: 'hSOL/XRD',
    componentAddress:
      'component_rdx1crltpml9fdn42tv6sjpjyq799ztq2yvzqfsp0ak7jpprt42eldrrwj',
    lpResourceAddress:
      'resource_rdx1ntrddec3kz4njfsx7ty7jw9hhsrtm9td9kzrgv5kc0h2c54m4umkws',
    token_x:
      'resource_rdx1t5ljlq97xfcewcdjxsqld89443fchqg96xv8a8k8gdftdycy9haxpx',
    token_y: XRD_ADDRESS,
    divisibility_x: 9,
    divisibility_y: 18
  },
  {
    name: 'EARLY/XRD',
    componentAddress:
      'component_rdx1cqvn2u9wkgm9k6ksmz2qreau6gr3l0jdn6cwjqunnz2fluex0cgrrl',
    lpResourceAddress:
      'resource_rdx1ng9kjy72tctduldaa0w0xeha8nlua0vj0t0nts9qljmfxx7fv8q399',
    token_x:
      'resource_rdx1t5xv44c0u99z096q00mv74emwmxwjw26m98lwlzq6ddlpe9f5cuc7s',
    token_y: XRD_ADDRESS,
    divisibility_x: 18,
    divisibility_y: 18
  },
  {
    name: 'hBNB/XRD',
    componentAddress:
      'component_rdx1cq3zslamrr949gsj7xggr5c02znvurc9uma2rlyrhuj3j70xdjhty5',
    lpResourceAddress:
      'resource_rdx1n2ugznygucx6th6hhjfhlp50kva6wpyp3za704dr63ad3xxwnz2c8h',
    token_x:
      'resource_rdx1t4et4jddp2fdupr00k83ct9jpnkgewply42l5098ztjkfvjfedvjva',
    token_y: XRD_ADDRESS,
    divisibility_x: 18,
    divisibility_y: 18
  }
]

// ---------------------------------------------------------------------------
// Pool-unit pools (fungible LP) — Ociswap, DefiPlaza, CaviarNine
// ---------------------------------------------------------------------------

/** All pool-unit-based (fungible LP) pools across all DEXes. */
export const POOL_UNIT_POOLS: readonly PoolUnitPoolConfig[] = [
  // Ociswap basic pools
  {
    name: 'Ociswap Basic: EARLY/XRD',
    poolAddress:
      'pool_rdx1c5hm2rt67scp22pq6tpkfg6cd22g0wwz88065wsy9gdfnd86sv3t4t',
    lpResourceAddress:
      'resource_rdx1t5362v5zqsfkfe38uyl368edpsdm23u5g69qt55jn0ye8nf6umnnv9'
  },
  {
    name: 'Ociswap Basic: OCI/XRD',
    poolAddress:
      'pool_rdx1ckyg8aujf09uh8qlz6asst75g5w6pl6vu8nl6qrhskawcndyk6585y',
    lpResourceAddress:
      'resource_rdx1th7ew2u9c9t00xhk34efm9uj8zxnme48h4ypuerv5uu4ftz8j82gdm'
  },
  {
    name: 'Ociswap Basic: ILIS/XRD',
    poolAddress:
      'pool_rdx1ck0daslg9anw64t5ytq0g4svmuj85jwvrrhgz2005exh8gt6qxle4w',
    lpResourceAddress:
      'resource_rdx1t4vvunhvl24nrc8hh99dujuumyllvvsurvu72keaeh74e25358nhah'
  },
  {
    name: 'Ociswap Basic: WEFT/XRD',
    poolAddress:
      'pool_rdx1ck5w5vnm6qwrmcp4way3wtyjztk7armjea3xc5xaktlk9r4gq6s3ee',
    lpResourceAddress:
      'resource_rdx1th5slwxk8x8xs7438ek6kp7kvrz5lxuu823tql4dqvd92q2fzxr3aq'
  },
  // Ociswap flex pools
  {
    name: 'Ociswap Flex: ILIS/XRD',
    poolAddress:
      'pool_rdx1c5cyh7lhxly2mxzsmrs4c99vhxt9jzap3gaf7s8h0h68fqlpfht0un',
    lpResourceAddress:
      'resource_rdx1t4qxj7nnm0sra6f6j9jq73erd489hdad6jp92hggtfwgwy9p2mgn76'
  },
  // CaviarNine HLP
  {
    name: 'CaviarNine HLP: LSULP/XRD (HLP)',
    poolAddress:
      'pool_rdx1chmckjpr0ks5lk6h7mqvmrw56wt4w6tsuy6n2jhd8fhr8vc5en5e90',
    lpResourceAddress:
      'resource_rdx1th0f0khh9g8hwa0qtxsarmq8y7yeekjnh4n74494d5zf4k5vw8qv6m'
  },
  // CaviarNine simple pools
  {
    name: 'CaviarNine Simple: REDDICKS/LSULP',
    poolAddress:
      'pool_rdx1chmx480a0crrnaqyg2e6tr7wtqwk5239grzs6ecckcmhqjm3gdmm73',
    lpResourceAddress:
      'resource_rdx1tkjspzkzmhyzxwcrjha3y2aapmg5690vayjehqtfa729jnr88hcaue'
  },
  {
    name: 'CaviarNine Simple: FLOOP/XRD',
    poolAddress:
      'pool_rdx1ch3vyhagpzqll4cu6quafdpkf7lvyuz7ke4z66tuqpxhvtxzd9lvmu',
    lpResourceAddress:
      'resource_rdx1th2pnc0lzgp20wwv2r22knjn32ntvecapws6v7z644c0d3rzz0fvng'
  },
  {
    name: 'CaviarNine Simple: hUSDC/XRD',
    poolAddress:
      'pool_rdx1c5dcv0r8tz0tzw8radv3grwvdj6jkya84c93k30mqmx70tyatlye0n',
    lpResourceAddress:
      'resource_rdx1tk9hawstw3k86c7qynvvr5tssttnsy4uurkz7d36fkz8cug9yw9925'
  },
  {
    name: 'CaviarNine Simple: hETH/XRD',
    poolAddress:
      'pool_rdx1chcefkz8qqlhl4tk6vm2ftwh7qmht8yru5cxwl0e5r444tw86vzjwd',
    lpResourceAddress:
      'resource_rdx1t5qpw4hf8k60mvn708c46rm7wu8st7kaqwy98nkf987fa2w7ue8kyz'
  },
  {
    name: 'CaviarNine Simple: hwBTC/XRD',
    poolAddress:
      'pool_rdx1ck3ckkse8g2ct0ep4gcymctkfs56ff37lfwlg4w3ehwvgz64evlhf5',
    lpResourceAddress:
      'resource_rdx1thzkkqkeye5qzp5p4nweux47v2elz3v693dg6z20q2ayxaxmdjy52h'
  },
  {
    name: 'CaviarNine Simple: hSOL/XRD',
    poolAddress:
      'pool_rdx1ckg7s8tlluauzxcv8axfl5l4adgzuwan40s7dcmkmwzkc87qletaj9',
    lpResourceAddress:
      'resource_rdx1tkjrw4dr0fyazpu9lql307xv26hy7a8p39m0f6de7ykk2um0965x6f'
  },
  {
    name: 'CaviarNine Simple: hSOL/XRD (v2)',
    poolAddress:
      'pool_rdx1c5dedvmk9nc6pzdk4x00l0r7aut4v2sw9r8lvwlau9rgnumqdvkzce',
    lpResourceAddress:
      'resource_rdx1tksrs4q8f0jv7uq5cnmv2n3snn3vvn62rmp67vthwg25qpaj9vhm88'
  },
  {
    name: 'CaviarNine Simple: hETH/XRD (v2)',
    poolAddress:
      'pool_rdx1ckw50qh8gry85hvq4ctdf95edns7gzeue4jx305td8cgttm8ljutd2',
    lpResourceAddress:
      'resource_rdx1tht9kj9vpdwhny77dn73lqx4ca2tut9yc5q752mhvgtcdhfzyzzn2s'
  },
  {
    name: 'CaviarNine Simple: hUSDC/XRD (v2)',
    poolAddress:
      'pool_rdx1ckgx9waann7djd7frcqevjxq7fh8tfdr5qvyz6ux7s0jkn03mgekkg',
    lpResourceAddress:
      'resource_rdx1t57hslzkmwlcz4fgy6p5xph7v83y6x6n8wjwkn0fphy8cvh6jyntyf'
  },
  {
    name: 'CaviarNine Simple: hwBTC/XRD (v2)',
    poolAddress:
      'pool_rdx1ckp8p90n89qjttl5qzyu6a4dugmxuxkxax4rfsye5fhp6j97jxxvj5',
    lpResourceAddress:
      'resource_rdx1t5x5jmvtwzz9wupx3gcatmq8e2d34kpk364jkhk9ydvwp5ag8t76xc'
  },
  {
    name: 'CaviarNine Simple: hBNB/XRD',
    poolAddress:
      'pool_rdx1c5v5l4ltfy2sgwel8a5x3dte82xgfchky5n8ppkxlm29ngm5hq6qaz',
    lpResourceAddress:
      'resource_rdx1thjv6ex5k66vylwaj59pjvrceg4k0ncf44hsu9aa8rqwgn37vkz7qm'
  },
  // DefiPlaza pools
  {
    name: 'DefiPlaza Base: xUSDC/XRD',
    poolAddress:
      'pool_rdx1c5z06xda4gjykyhupj4fjszdfhsye7h3mcsgwe5cvuz2vemwn7yjax',
    lpResourceAddress:
      'resource_rdx1tkdws0nvfwjnn2q62x4gqgelyt4t5z7cn58pwvrtf4zrxtdw2sem8x'
  },
  {
    name: 'DefiPlaza Quote: xUSDC/XRD',
    poolAddress:
      'pool_rdx1ch62axcl22gnmhe5ajtwraukrxstxxqlq5c6p9n2y5qv0pgyqnhfry',
    lpResourceAddress:
      'resource_rdx1t5gr3wsf7jq28fvnpyfg4rwfkewynv67nnqjna9h5f7mwjuwcwegcj'
  },
  {
    name: 'DefiPlaza Base: xUSDT/XRD',
    poolAddress:
      'pool_rdx1c5pvssdmlgjh78anllzszh7alal666ayv8h6at3xmxmmpueqf7at4q',
    lpResourceAddress:
      'resource_rdx1thnmcry6e02x6ja73llm8z6pkrurvrsudgez4ammsp24r0v20rllxt'
  },
  {
    name: 'DefiPlaza Quote: xUSDT/XRD',
    poolAddress:
      'pool_rdx1c4scl7k67czs4e29skz0njvcmx4epmrjk4nkrkvsmt93rug7jcnagf',
    lpResourceAddress:
      'resource_rdx1t5swt0y0u6sdzycg02flamm3e6qljjgvpxeg5p5tw6jl7ssel0x369'
  },
  {
    name: 'DefiPlaza Base: xETH/XRD',
    poolAddress:
      'pool_rdx1ckt7dhmt5gr9vdsgz3p62fm88pm7f69kzzqw2268f3negvgns2xkpa',
    lpResourceAddress:
      'resource_rdx1t5k00sp4jejklp8cx6nw7ecvhz7z07mfexgmdyflgqpflfvzv8v7wd'
  },
  {
    name: 'DefiPlaza Quote: xETH/XRD',
    poolAddress:
      'pool_rdx1c5glrayedmn0utd44pqs8a3x52dw9aklq2g5f9ewxjxtm7xvjmussa',
    lpResourceAddress:
      'resource_rdx1thhth6tseavhurrgae898k9sht29f3yckzr6szct6zgheqdhxkus0t'
  },
  {
    name: 'DefiPlaza Base: xwBTC/XRD',
    poolAddress:
      'pool_rdx1c5xlqz5uc62fzlsyl2f3ql6lx8upc75tdpe4f8cmys83lpqrrul976',
    lpResourceAddress:
      'resource_rdx1t4x7f34hec2jxtay6cvxvcq3skmkg9pwtr98m4dm7qfrvnaddlavgv'
  },
  {
    name: 'DefiPlaza Quote: xwBTC/XRD',
    poolAddress:
      'pool_rdx1cht7hqhcnj2la96cygema5l32xwz26luunr9umlszy3s9gr78ppdzv',
    lpResourceAddress:
      'resource_rdx1th6ftl6twglqfz2s8ref2vr5nfccaeq2878p4996uq5duszkjhp2gl'
  },
  {
    name: 'DefiPlaza Base: XRD/DFP2',
    poolAddress:
      'pool_rdx1chxn0nqj840r78t2ah5agchq4ue9p65q23nc9ckqfe0mmjstq8fyg0',
    lpResourceAddress:
      'resource_rdx1tknxlx2sy23qkg6twvnu3kqcd5l4daacq0n6mdam54upqgx50f4ju8'
  },
  {
    name: 'DefiPlaza Quote: XRD/DFP2',
    poolAddress:
      'pool_rdx1c4547fnprjhlp2m27aycmf8rzrkrfzcck58jt2706r85gpcaeapz7k',
    lpResourceAddress:
      'resource_rdx1t4a5clnxmnctmezaty08cuugfzmj2lezqcjk2szezrfdfl4w4ederu'
  },
  {
    name: 'DefiPlaza Base: hETH/XRD',
    poolAddress:
      'pool_rdx1ckfa8h47ghy8enmz29k6cxgl5x87qy3gkzetsw82fpuvrdzc6563q2',
    lpResourceAddress:
      'resource_rdx1tha0rthe4jgmwuz0074eazu3n8w2v8m5mpx453vq5ux7dqnaxz0y0g'
  },
  {
    name: 'DefiPlaza Quote: hETH/XRD',
    poolAddress:
      'pool_rdx1chawt3wgkpe0jkdhgrysw9dducx3032nse8r9tfl4gsxfqp2z2alx5',
    lpResourceAddress:
      'resource_rdx1t4xldwkew79skplfk3lempg459xhlhzj5xy5r86jfjrud29lpalytd'
  },
  {
    name: 'DefiPlaza Base: hUSDC/XRD',
    poolAddress:
      'pool_rdx1chxzajmur7p67h0uvk7etgnm9m67ptzfv7ysfdvq35ck2zz6zuttqq',
    lpResourceAddress:
      'resource_rdx1t5qsyevr7ry54uxeh9s7nm6wjdan0c8ks63c2dmpdxsdumum2vsl82'
  },
  {
    name: 'DefiPlaza Quote: hUSDC/XRD',
    poolAddress:
      'pool_rdx1c5t2v0jac6sdyv9qs5hur76uc5kjr70sl8dftc5aa92k0tsuc06r04',
    lpResourceAddress:
      'resource_rdx1tkjvn5zek8aj34rmzd9vd5qtr35x4ytlud857cgnq066lzkc0mygzw'
  },
  {
    name: 'DefiPlaza Base: hwBTC/XRD',
    poolAddress:
      'pool_rdx1c5xdcsxjfpled776cl2ln2mdv9svh5sp4z8u3qhv5r5sslnuxul7rs',
    lpResourceAddress:
      'resource_rdx1tkaems6ywyrqrs7vk0fjk87s8sa2n0wcc4zzkyms04nu6mv739xpyd'
  },
  {
    name: 'DefiPlaza Quote: hwBTC/XRD',
    poolAddress:
      'pool_rdx1ckv54hdmtyn308zkm3mq98876puwhpqa3hrn8d27swgspaackvnmu7',
    lpResourceAddress:
      'resource_rdx1t575tme0szzjp78ms6m2h6suale84d9ululvwhfkm0jdw2y9n50c2f'
  },
  {
    name: 'DefiPlaza Base: hUSDT/XRD',
    poolAddress:
      'pool_rdx1ch5zj8tlarxz38kwh4ss3jn5mphd98rssalkmfut6mhzvswezzg3vd',
    lpResourceAddress:
      'resource_rdx1t46hgy2ut87zeu8jfv6k24d8l4s7mjwjdqsd2qnvu644gyc4l7g0xn'
  },
  {
    name: 'DefiPlaza Quote: hUSDT/XRD',
    poolAddress:
      'pool_rdx1ckvu5wqp2pc284yj7jssckueqtcvt72gjjwz4sv4rl5kdtk70etg2n',
    lpResourceAddress:
      'resource_rdx1t45t2dpdgydlrtpxejwm04uvn2dc8p7nmch8ffcd0vf25axd0aptdk'
  },
  {
    name: 'DefiPlaza Base: hSOL/XRD',
    poolAddress:
      'pool_rdx1c4lrpucdyfhe52znmp3qe8jnjmnt25u6s4hhtz9k88ngju0urj5yy4',
    lpResourceAddress:
      'resource_rdx1tkuxyrqa6lzpsmh75v9af55v4q5gu35wxx0wh30lz6uqd265u0hgvq'
  },
  {
    name: 'DefiPlaza Quote: hSOL/XRD',
    poolAddress:
      'pool_rdx1c43fvtx682u76wz6agel9374sa93kzndkjvz7lh4mdqm8x649krvnq',
    lpResourceAddress:
      'resource_rdx1th7zlzjs0elh2pgr3ce4g8k4g4w2l2sfq27se78dghaqhcx6xq3c5w'
  },
  {
    name: 'DefiPlaza Base: hBNB/XRD',
    poolAddress:
      'pool_rdx1ch0aecz95kl9vdvyz6q3zh4p6vcshefwakx3jfs3uk34y8sv8d8uvy',
    lpResourceAddress:
      'resource_rdx1t4d5n87gsq5vg0xlszyvmd8pgxv5a9nyrj7u9frgxcsy2gtgqk2d3h'
  },
  {
    name: 'DefiPlaza Quote: hBNB/XRD',
    poolAddress:
      'pool_rdx1c42dp3amx7el85vv588vxkqjn53rd8np30qyrpf5pk95uaalu057d4',
    lpResourceAddress:
      'resource_rdx1thhctpg6ctkr7pf4axk0p3ysuyu7574essvj8r8m2d7tf4709x9e6z'
  }
]

// ---------------------------------------------------------------------------
// CaviarNine — shape pools (concentrated, NFT receipt)
// ---------------------------------------------------------------------------

/** CaviarNine shape liquidity pools (concentrated, NFT receipt) — only those with XRD or LSULP */
export const CAVIARNINE_SHAPE_POOLS: readonly ShapePoolConfig[] = [
  {
    name: 'LSULP/XRD',
    componentAddress:
      'component_rdx1crdhl7gel57erzgpdz3l3vr64scslq4z7vd0xgna6vh5fq5fnn9xas',
    token_x: LSULP_RESOURCE_ADDRESS,
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1ntrysy2sncpj6t6shjlgsfr55dns9290e2zsy67fwwrp6mywsrrgsc'
  },
  {
    name: 'LSULP/XRD (v2)',
    componentAddress:
      'component_rdx1crjdsyydayu8wuk6zayxlp26fxlsqghvn4cfr0vy5cqqv84qw9fzsx',
    token_x: LSULP_RESOURCE_ADDRESS,
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1nfq77djs9udlkhg0ft3qyh2ksjfs0syehq36h5n6ysrr7kvedagzkw'
  },
  {
    name: 'xwBTC/XRD',
    componentAddress:
      'component_rdx1cp9w8443uyz2jtlaxnkcq84q5a5ndqpg05wgckzrnd3lgggpa080ed',
    token_x:
      'resource_rdx1t580qxc7upat7lww4l2c4jckacafjeudxj5wpjrrct0p3e82sq4y75',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1nfdteayvxl6425jc5x5xa0p440h6r2mr48mgtj58szujr5cvgnfmn9'
  },
  {
    name: 'XRD/xUSDC',
    componentAddress:
      'component_rdx1cr6lxkr83gzhmyg4uxg49wkug5s4wwc3c7cgmhxuczxraa09a97wcu',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1t4upr78guuapv5ept7d7ptekk9mqhy605zgms33mcszen8l9fac8vf',
    liquidity_receipt:
      'resource_rdx1ntzhjg985wgpkhda9f9q05xqdj8xuggfw0j5u3zxudk2csv82d0089'
  },
  {
    name: 'xETH/XRD',
    componentAddress:
      'component_rdx1cpsvw207842gafeyvf6tc0gdnq47u3mn74kvzszqlhc03lrns52v82',
    token_x:
      'resource_rdx1th88qcj5syl9ghka2g9l7tw497vy5x6zaatyvgfkwcfe8n9jt2npww',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1nthy5lna9l0tgtfxzxcrn6hmle0uymrutqwnlcj8tuujpz3s62wlc5'
  },
  {
    name: 'XRD/xUSDT',
    componentAddress:
      'component_rdx1cqs338cyje65rk44zgmjvvy42qcszrhk9ewznedtkqd8l3crtgnmh5',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1thrvr3xfs2tarm2dl9emvs26vjqxu6mqvfgvqjne940jv0lnrrg7rw',
    liquidity_receipt:
      'resource_rdx1nft63kjp38agw0z8nnwkyjhcgpzwjer84945h5z8yr663fgukjyp3l'
  },
  {
    name: 'FLOOP/XRD',
    componentAddress:
      'component_rdx1czgaazn4wqf40kav57t8tu6kwv2a5sfmnlzlar9ee6kdqk0ll2chsz',
    token_x:
      'resource_rdx1t5pyvlaas0ljxy0wytm5gvyamyv896m69njqdmm2stukr3xexc2up9',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1ntpkcfe5ny37wk487ruuxj8wrgk6qg8rjq80m08un4yg98dmyj6msq'
  },
  {
    name: 'DFP2/XRD',
    componentAddress:
      'component_rdx1cqaknlm9rfjxvzwhp7mzsjzustqpuqn6yhsmh8fn3zyr8sm5p3j7ny',
    token_x:
      'resource_rdx1t5ywq4c6nd2lxkemkv4uzt8v7x7smjcguzq5sgafwtasa6luq7fclq',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1nt2vqgq43sr42pgfk625cl6yrzpreq5xqatkf2pgwm9dy7tjuv7e2v'
  },
  {
    name: 'EARLY/XRD',
    componentAddress:
      'component_rdx1cpgf3nkgq4ry569rtn3pl6ytymuwh3d23w3vvawxfcnhhzm77e8jys',
    token_x:
      'resource_rdx1t5xv44c0u99z096q00mv74emwmxwjw26m98lwlzq6ddlpe9f5cuc7s',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1nfcf90emj9e2ujyuywwa0dsnqxlruar54gz4z7zjxmwtpx67xsrmnc'
  },
  {
    name: 'XRD/hUSDT',
    componentAddress:
      'component_rdx1cph6ayqwqgnavd5yjxjx966nfcnxwt85k9p8fqv37r5pfnn3qcm6az',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1th4v03gezwgzkuma6p38lnum8ww8t4ds9nvcrkr2p9ft6kxx3kxvhe',
    liquidity_receipt:
      'resource_rdx1ng4val4sld9gjwhys6af3wsudk6xdrfr2rhsfswnmz474e2dxacv8x'
  },
  {
    name: 'XRD/hUSDC',
    componentAddress:
      'component_rdx1cqelumvmmgwths34k9pp0htd2ykwq7d70m0r389etwh39ul3j5tyj5',
    token_x: XRD_ADDRESS,
    token_y:
      'resource_rdx1thxj9m87sn5cc9ehgp9qxp6vzeqxtce90xm5cp33373tclyp4et4gv',
    liquidity_receipt:
      'resource_rdx1ngsnjtypwayhkwnyu0swmh2ryu398xtq6gt5lz82n4tyyvs6qyd4wn'
  },
  {
    name: 'hETH/XRD',
    componentAddress:
      'component_rdx1cqr24rye05h28qnn5crjwlq0djvfcmaegg8sgdkwywfx6s97nk9fcy',
    token_x:
      'resource_rdx1th09yvv7tgsrv708ffsgqjjf2mhy84mscmj5jwu4g670fh3e5zgef0',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1n2hw9fr5eaa89gpxapjnjphdzc4u54unfunckz0dceqh9jl2hjgtqq'
  },
  {
    name: 'hwBTC/XRD',
    componentAddress:
      'component_rdx1crmvyl8nghu4g9ssxjq3yns793mqpn7nkc2cx5rmd2rzkaw0x755cu',
    token_x:
      'resource_rdx1t58kkcqdz0mavfz98m98qh9m4jexyl9tacsvlhns6yxs4r6hrm5re5',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1ngj84n8y5wnpu6vff40l04k2eecryp8zlcu5ff68j5vrf6q484ac6y'
  },
  {
    name: 'hSOL/XRD',
    componentAddress:
      'component_rdx1cr3agr45z2z8eayp7zc5776ezskwxfr2p4hrrzxzfu20dug83w52cp',
    token_x:
      'resource_rdx1t5ljlq97xfcewcdjxsqld89443fchqg96xv8a8k8gdftdycy9haxpx',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1n2rgdlr3729sl394qk3a8jrszrrcwtwnq4e6nvtlptx5hmpl797zph'
  },
  {
    name: 'hBNB/XRD',
    componentAddress:
      'component_rdx1crqvzwc3wntan0u0793m2kqwpdsv8g44k5h9fnnm3zcy5v5chugd2u',
    token_x:
      'resource_rdx1t4et4jddp2fdupr00k83ct9jpnkgewply42l5098ztjkfvjfedvjva',
    token_y: XRD_ADDRESS,
    liquidity_receipt:
      'resource_rdx1n25g4ge2hp5qp9ut0usekdng8lm9rv9dyqlq9ng9kqwngutvamcxd5'
  }
]
