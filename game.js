module.exports={
    move_piece,
    decision
}

function roll_dice(){
    let a,b;
    a=Math.floor(Math.random()*6)+1;
    b=Math.floor(Math.random()*6)+1;
    return a+b;
}

function move_piece(curr_pos){
    let c=roll_dice();
    let new_pos=(curr_pos+c);
    return new_pos;
}

function decision(player_name,ownership,money,price,place_name){
    if(place_name=="city" || place_name=="company"){

        if(player_name==ownership){
            return 3;//player already ownes the place
        }
        else{
            if(ownership==0 && money<price){
                return 2;//money less than price cannot buy
            }
            if(ownership==0 && money>=price){
                return 0;//can buy if wants to
            }
    
            if(ownership!=player_name){
                return 1;//pays rent
            }
        }
    }else{
        return 4;
    }
}