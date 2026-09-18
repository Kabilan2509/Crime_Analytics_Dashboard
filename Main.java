import java.util.*;
public class Main{
    public static void main(String[] args){
        Scanner sc=new Scanner(System.in);
        int t=sc.nextInt();
        while(t-->0){
            int n=sc.nextInt();
            int k=sc.nextInt();
            int a[]=new int[n];
            int b[]=new int[n];
            for(int i=0;i<n;i++){
                a[i]=sc.nextInt();
            }
            for(int i=0;i<n;i++){
                b[i]=sc.nextInt();
            }
            int max_b=0;
            int sum=0;
            int r=0;
            for(int i=0;i<Math.min(n,k);i++){
                sum+=a[i];
                max_b=Math.max(max_b,b[i]);
                r=Math.max(r,sum+(k-(i-1))*max_b);
            }
            System.out.println(r);
        }
    }
}		