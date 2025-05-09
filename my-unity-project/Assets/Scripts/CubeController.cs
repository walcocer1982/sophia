using UnityEngine;
using Photon.Pun;

public class CubeController : MonoBehaviourPun
{
    private float rotationSpeed = 100f;

    void Update()
    {
        if (PhotonNetwork.IsMasterClient)
        {
            RotateCube();
            SyncRotation();
        }
    }

    private void RotateCube()
    {
        float horizontalInput = Input.GetAxis("Horizontal");
        float verticalInput = Input.GetAxis("Vertical");
        Vector3 rotation = new Vector3(verticalInput, horizontalInput, 0) * rotationSpeed * Time.deltaTime;
        transform.Rotate(rotation);
    }

    private void SyncRotation()
    {
        photonView.RPC("UpdateRotation", RpcTarget.Others, transform.rotation);
    }

    [PunRPC]
    private void UpdateRotation(Quaternion newRotation)
    {
        transform.rotation = newRotation;
    }
}